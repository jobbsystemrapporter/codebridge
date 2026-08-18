import Foundation

// Devspace keeps its bridge alive with a launchd KeepAlive agent. CodeBridge has to
// do the same for people who will never open Terminal, so the app installs and
// bootstraps its own agent pointing at the runtime inside this bundle.
//
// ServiceController probes 127.0.0.1:4317 before spawning anything, so once the
// agent owns the service the app simply attaches to it instead of starting a
// second copy.
enum LaunchAgent {
    static let label = "com.codebridge.app"

    static var plistURL: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/LaunchAgents/\(label).plist")
    }

    /// Installs and loads the agent. Only meaningful for a real .app bundle: a
    /// development build lives at a path that would break the moment it moves.
    @discardableResult
    static func install(node: String, root: String, helper: String) -> Bool {
        guard Bundle.main.bundleURL.pathExtension == "app" else { return false }
        guard FileManager.default.isExecutableFile(atPath: node) else { return false }

        let job: [String: Any] = [
            "Label": label,
            "ProgramArguments": [node, "\(root)/server.mjs"],
            "WorkingDirectory": root,
            "EnvironmentVariables": [
                "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
                "HOME": FileManager.default.homeDirectoryForCurrentUser.path,
                "CODEBRIDGE_HELPER": helper,
            ],
            "RunAtLoad": true,
            // Restart on crash, but not when the service exits cleanly because
            // another CodeBridge already holds the port — that would throttle-loop.
            "KeepAlive": ["SuccessfulExit": false],
            "ProcessType": "Interactive",
        ]

        guard let data = try? PropertyListSerialization.data(fromPropertyList: job, format: .xml, options: 0)
        else { return false }

        let url = plistURL
        do {
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            // Rewrite unconditionally: the bundle may have moved since last launch.
            let existing = try? Data(contentsOf: url)
            if existing != data {
                try data.write(to: url, options: .atomic)
                bootout()
            }
        } catch { return false }

        return bootstrap()
    }

    @discardableResult
    static func bootstrap() -> Bool {
        run(["bootstrap", domain, plistURL.path])
    }

    @discardableResult
    static func bootout() -> Bool {
        run(["bootout", "\(domain)/\(label)"])
    }

    private static var domain: String { "gui/\(getuid())" }

    private static func run(_ args: [String]) -> Bool {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/bin/launchctl")
        p.arguments = args
        p.standardOutput = FileHandle.nullDevice
        p.standardError = FileHandle.nullDevice
        do { try p.run() } catch { return false }
        p.waitUntilExit()
        return p.terminationStatus == 0
    }
}
