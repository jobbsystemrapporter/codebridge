// swift-tools-version: 6.0
import PackageDescription
let package = Package(name:"CodeBridgeHelper", platforms:[.macOS(.v14)], products:[.executable(name:"codebridge-helper",targets:["CodeBridgeHelper"])], targets:[.executableTarget(name:"CodeBridgeHelper")])
