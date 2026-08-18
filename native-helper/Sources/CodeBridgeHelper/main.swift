import Foundation
import CryptoKit

struct Request: Codable { let cwd:String; let executable:String; let args:[String]; let timeoutMs:Int?; let capability:String }
struct Capability: Codable { let v:Int; let workspace:String; let executable:String; let args:[String]; let iat:Int64; let exp:Int64; let nonce:String }
struct Response: Codable { let ok:Bool; let exitCode:Int32; let stdout:String; let stderr:String; let error:String? }
let blocked:Set<String>=["sudo","su","doas","shutdown","reboot","mkfs","diskutil","launchctl"]
func b64decode(_ s:String)->Data? { var v=s.replacingOccurrences(of:"-",with:"+").replacingOccurrences(of:"_",with:"/"); while v.count % 4 != 0 { v += "=" }; return Data(base64Encoded:v) }
func verifyCapability(_ token:String, req:Request)->Bool {
    let parts=token.split(separator:".",omittingEmptySubsequences:false); guard parts.count==2,let body=b64decode(String(parts[0])),let sig=b64decode(String(parts[1])) else{return false}
    let env=ProcessInfo.processInfo.environment; let stateRoot=env["CODEBRIDGE_HOME"] ?? FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".codebridge").path
    let secretPath=URL(fileURLWithPath:stateRoot).appendingPathComponent("local-secret"); guard let secret=try? Data(contentsOf:secretPath) else{return false}
    let key=SymmetricKey(data:Data(String(decoding:secret,as:UTF8.self).trimmingCharacters(in:.whitespacesAndNewlines).utf8)); let expected=Data(HMAC<SHA256>.authenticationCode(for:Data(parts[0].utf8),using:key)); guard expected==sig,let cap=try? JSONDecoder().decode(Capability.self,from:body) else{return false}
    let now=Int64(Date().timeIntervalSince1970*1000); return cap.v==1 && now<=cap.exp && cap.exp-cap.iat<=120000 && cap.workspace==req.cwd && cap.executable==req.executable && cap.args==req.args
}
let allowed:Set<String>=["pwd","ls","git","npm","pnpm","yarn","node"]
func emit(_ r:Response)->Never{let d=try! JSONEncoder().encode(r);FileHandle.standardOutput.write(d);FileHandle.standardOutput.write(Data([10]));exit(r.ok ? 0:1)}

guard CommandLine.arguments.count==2,CommandLine.arguments[1]=="exec" else { emit(Response(ok:false,exitCode:64,stdout:"",stderr:"",error:"Usage: codebridge-helper exec")) }
let input=FileHandle.standardInput.readDataToEndOfFile()
guard input.count <= 256*1024,let req=try? JSONDecoder().decode(Request.self,from:input) else { emit(Response(ok:false,exitCode:65,stdout:"",stderr:"",error:"Invalid request")) }
guard verifyCapability(req.capability,req:req) else { emit(Response(ok:false,exitCode:77,stdout:"",stderr:"",error:"Workspace capability is invalid, expired, or does not match this command")) }
let cwd=URL(fileURLWithPath:req.cwd).standardizedFileURL.path
let exeName=URL(fileURLWithPath:req.executable).lastPathComponent
guard !blocked.contains(exeName),allowed.contains(exeName) else { emit(Response(ok:false,exitCode:77,stdout:"",stderr:"",error:"Executable is not allowed by helper policy")) }
guard req.args.count<=128,req.args.allSatisfy({$0.utf8.count<=8192 && !$0.contains("\u{0000}")}) else { emit(Response(ok:false,exitCode:65,stdout:"",stderr:"",error:"Arguments exceed limits")) }
var isDir:ObjCBool=false
guard FileManager.default.fileExists(atPath:cwd,isDirectory:&isDir),isDir.boolValue else { emit(Response(ok:false,exitCode:66,stdout:"",stderr:"",error:"Working directory does not exist")) }
let p=Process();p.currentDirectoryURL=URL(fileURLWithPath:cwd);p.executableURL=URL(fileURLWithPath:"/usr/bin/env");p.arguments=[req.executable]+req.args;p.environment=["PATH":"/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin","HOME":FileManager.default.homeDirectoryForCurrentUser.path,"TMPDIR":NSTemporaryDirectory(),"LANG":"en_US.UTF-8","TERM":"dumb","CODEBRIDGE":"1","CI":"1"]
let outURL=URL(fileURLWithPath:NSTemporaryDirectory()).appendingPathComponent("codebridge-out-\(UUID().uuidString)")
let errURL=URL(fileURLWithPath:NSTemporaryDirectory()).appendingPathComponent("codebridge-err-\(UUID().uuidString)")
FileManager.default.createFile(atPath:outURL.path,contents:nil);FileManager.default.createFile(atPath:errURL.path,contents:nil)
let outHandle=try! FileHandle(forWritingTo:outURL),errHandle=try! FileHandle(forWritingTo:errURL);p.standardOutput=outHandle;p.standardError=errHandle
do{try p.run()}catch{try? outHandle.close();try? errHandle.close();emit(Response(ok:false,exitCode:69,stdout:"",stderr:"",error:error.localizedDescription))}
let deadline=Date().addingTimeInterval(Double(min(max(req.timeoutMs ?? 120000,1000),120000))/1000.0)
while p.isRunning && Date()<deadline { Thread.sleep(forTimeInterval:0.05) }
if p.isRunning { p.terminate(); Thread.sleep(forTimeInterval:0.2); if p.isRunning { kill(p.processIdentifier,SIGKILL) } }
p.waitUntilExit();try? outHandle.close();try? errHandle.close()
let stdout=String(data:(try? Data(contentsOf:outURL))?.prefix(2*1024*1024) ?? Data(),encoding:.utf8) ?? ""
let stderr=String(data:(try? Data(contentsOf:errURL))?.prefix(2*1024*1024) ?? Data(),encoding:.utf8) ?? ""
try? FileManager.default.removeItem(at:outURL);try? FileManager.default.removeItem(at:errURL)
emit(Response(ok:p.terminationStatus==0,exitCode:p.terminationStatus,stdout:stdout,stderr:stderr,error:p.terminationStatus==0 ? nil:"Process exited with status \(p.terminationStatus)"))
