import AppKit
import Foundation

@MainActor
final class FolderAccess {
    static let shared = FolderAccess()
    private let defaultsKey = "CodeBridge.SecurityScopedBookmarks"

    func chooseFolder() -> URL? {
        let panel = NSOpenPanel()
        panel.title = "Choose a project folder"
        panel.prompt = "Allow CodeBridge"
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        guard panel.runModal() == .OK, let url = panel.url else { return nil }
        saveBookmark(for: url)
        return url
    }

    func saveBookmark(for url: URL) {
        do {
            let data = try url.bookmarkData(options: [.withSecurityScope], includingResourceValuesForKeys: nil, relativeTo: nil)
            var all = UserDefaults.standard.array(forKey: defaultsKey) as? [Data] ?? []
            if !all.contains(data) { all.append(data) }
            UserDefaults.standard.set(all, forKey: defaultsKey)
        } catch { NSLog("CodeBridge bookmark error: \(error.localizedDescription)") }
    }

    func restoreFolders() -> [URL] {
        let all = UserDefaults.standard.array(forKey: defaultsKey) as? [Data] ?? []
        return all.compactMap { data in
            var stale = false
            guard let url = try? URL(resolvingBookmarkData: data, options: [.withSecurityScope], relativeTo: nil, bookmarkDataIsStale: &stale) else { return nil }
            if stale { saveBookmark(for: url) }
            _ = url.startAccessingSecurityScopedResource()
            return url
        }
    }
}
