import Foundation

struct LegacyFullBackupMetadata: Sendable {
    var backupType: String
    var backupTime: String?
    var currentTableID: String?
    var appName: String?
}

struct LegacyImportSummary: Sendable {
    var tableCount: Int
    var classCount: Int
    var teacherCount: Int
    var roomCount: Int
    var courseCount: Int
    var templateCount: Int
}

enum LegacyImportError: Error, LocalizedError {
    case invalidBackupType(String)
    case decodingFailed(String)

    var errorDescription: String? {
        switch self {
        case .invalidBackupType(let type):
            "Unsupported backupType: \(type)"
        case .decodingFailed(let detail):
            "Could not decode legacy backup: \(detail)"
        }
    }
}

protocol LegacyBackupImporting: Sendable {
    /// Parse legacy `fullBackup` JSON (see `Resources/Fixtures/fullBackup.placeholder.json`).
    func preview(data: Data) async throws -> (LegacyFullBackupMetadata, LegacyImportSummary)

    /// Normalize and persist into SwiftData (stub returns summary only).
    func importFullBackup(data: Data) async throws -> LegacyImportSummary
}
