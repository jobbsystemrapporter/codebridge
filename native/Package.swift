// swift-tools-version: 6.0
import PackageDescription
let package = Package(name: "CodeBridge", platforms: [.macOS(.v14)], products: [.executable(name: "CodeBridge", targets: ["CodeBridge"])], targets: [.executableTarget(name: "CodeBridge")])
