import AppKit
import Foundation
import WebKit

@MainActor
final class NativeBridge: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?

    func attach(to webView: WKWebView) {
        self.webView = webView
        webView.configuration.userContentController.add(self, name: "codebridgeNative")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let action = body["action"] as? String else { return }
        switch action {
        case "chooseFolder":
            if let url = FolderAccess.shared.chooseFolder() { reply(["ok": true, "path": url.path]) }
            else { reply(["ok": false, "cancelled": true]) }
        case "openExternal":
            guard let raw = body["url"] as? String, let url = URL(string: raw), url.scheme == "https" else { reply(["ok": false, "error": "Only secure HTTPS links can be opened."]); return }
            reply(["ok": NSWorkspace.shared.open(url)])
        case "approve":
            let title = body["title"] as? String ?? "Allow this action?"
            let detail = body["detail"] as? String ?? "CodeBridge is requesting permission to run an action."
            let alert = NSAlert(); alert.messageText = title; alert.informativeText = detail; alert.alertStyle = .warning
            alert.addButton(withTitle: "Allow once"); alert.addButton(withTitle: "Cancel")
            reply(["ok": alert.runModal() == .alertFirstButtonReturn])
        case "trashApp":
            let bundle = Bundle.main.bundleURL
            guard bundle.pathExtension == "app" else {
                reply(["ok": false, "error": "Not running as a bundled app."]); return
            }
            do {
                try FileManager.default.trashItem(at: bundle, resultingItemURL: nil)
                reply(["ok": true])
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { NSApp.terminate(nil) }
            } catch {
                reply(["ok": false, "error": error.localizedDescription])
            }
        default: reply(["ok": false, "error": "Unknown native action"])
        }
    }

    private func reply(_ value: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: value), let json = String(data: data, encoding: .utf8) else { return }
        webView?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('codebridge-native-response',{detail:\(json)}))")
    }
}
