import Foundation

struct StubLegacyBackupImporter: LegacyBackupImporting {
    func preview(data: Data) async throws -> (LegacyFullBackupMetadata, LegacyImportSummary) {
        let metadata = try decodeMetadata(from: data)
        let summary = LegacyImportSummary(
            tableCount: 0,
            classCount: 0,
            teacherCount: 0,
            roomCount: 0,
            courseCount: 0,
            templateCount: 0
        )
        return (metadata, summary)
    }

    func importFullBackup(data: Data) async throws -> LegacyImportSummary {
        let (_, summary) = try await preview(data: data)
        return summary
    }

    private func decodeMetadata(from data: Data) throws -> LegacyFullBackupMetadata {
        let object = try JSONSerialization.jsonObject(with: data)
        guard let dict = object as? [String: Any] else {
            throw LegacyImportError.decodingFailed("root is not an object")
        }
        guard let backupType = dict["backupType"] as? String else {
            throw LegacyImportError.decodingFailed("missing backupType")
        }
        guard backupType == "fullBackup" else {
            throw LegacyImportError.invalidBackupType(backupType)
        }
        return LegacyFullBackupMetadata(
            backupType: backupType,
            backupTime: dict["backupTime"] as? String,
            currentTableID: dict["currentTableId"] as? String,
            appName: dict["appName"] as? String
        )
    }
}
