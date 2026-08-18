import SwiftUI
import WebKit

@main
struct CodeBridgeApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .frame(minWidth: 980, minHeight: 680)
        }
        .windowStyle(.hiddenTitleBar)
    }
}

struct ContentView: View {
    @State private var service = ServiceController()
    var body: some View {
        ZStack {
            Color(nsColor: .windowBackgroundColor).ignoresSafeArea()
            if service.ready {
                WebView(url: URL(string: "http://127.0.0.1:4317")!)
            } else {
                VStack(spacing: 18) {
                    ProgressView().controlSize(.large)
                    Text("Starting CodeBridge…").font(.title2.weight(.semibold))
                    Text(service.message).foregroundStyle(.secondary)
                    if service.failed { Button("Try again") { service.start() } }
                }.padding(40)
            }
        }
        .task { service.start() }
    }
}

@MainActor
@Observable
final class ServiceController {
    var ready = false
    var failed = false
    var message = "Preparing your local coding workspace."
    private var process: Process?

    func start() {
        ready = false; failed = false
        Task {
            guard let root = resolve(Bundle.main.object(forInfoDictionaryKey: "CodeBridgeRoot") as? String) else {
                if await probe() { ready = true; return }
                failed = true; message = "CodeBridge Core path is not configured in this development build."; return
            }
            let bundledNode = resolve(Bundle.main.object(forInfoDictionaryKey: "CodeBridgeNode") as? String)
            let nodeCandidates = [bundledNode, "/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node"].compactMap { $0 }
            guard let node = nodeCandidates.first(where: { FileManager.default.isExecutableFile(atPath: $0) }) else {
                if await probe() { ready = true; return }
                failed = true; message = "The bundled CodeBridge runtime is missing or damaged."; return
            }
            let helper = "\(root)/native-helper/.build/debug/codebridge-helper"

            // Install before probing. A service left running by an earlier launch
            // would otherwise short-circuit here and the agent would never be set
            // up, so the bridge would keep dying with the app. The agent is
            // idempotent, and a server that finds the port already served exits
            // cleanly rather than fighting for it.
            let agent = LaunchAgent.install(node: node, root: root, helper: helper)

            if await probe() { ready = true; return }

            if agent {
                for _ in 0..<30 { try? await Task.sleep(for: .milliseconds(200)); if await probe() { ready = true; return } }
            }

            let p = Process(); p.executableURL = URL(fileURLWithPath: node); p.arguments = ["\(root)/server.mjs"]; p.currentDirectoryURL = URL(fileURLWithPath: root)
            p.environment = ["PATH":"/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin","HOME":FileManager.default.homeDirectoryForCurrentUser.path,"TMPDIR":NSTemporaryDirectory(),"CODEBRIDGE_HELPER":helper]
            do { try p.run(); process = p } catch { failed = true; message = error.localizedDescription; return }
            for _ in 0..<30 { try? await Task.sleep(for: .milliseconds(200)); if await probe() { ready = true; return } }
            failed = true; message = "The local CodeBridge service did not become ready."
        }
    }
    private func resolve(_ value: String?) -> String? {
        guard let value, !value.isEmpty else { return nil }
        if value.hasPrefix("/") { return value }
        return Bundle.main.bundleURL.appendingPathComponent(value).path
    }
    private func probe() async -> Bool {
        do { let (_,r) = try await URLSession.shared.data(from: URL(string:"http://127.0.0.1:4317/api/status")!); return (r as? HTTPURLResponse)?.statusCode == 200 } catch { return false }
    }
}

struct WebView: NSViewRepresentable {
    let url: URL
    func makeCoordinator() -> NativeBridge { NativeBridge() }
    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let w = WKWebView(frame: .zero, configuration: config)
        context.coordinator.attach(to: w)
        w.load(URLRequest(url:url))
        return w
    }
    func updateNSView(_ view: WKWebView, context: Context) {}
}
