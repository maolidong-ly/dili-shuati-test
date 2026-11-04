import Foundation

struct ConflictIssue: Identifiable, Sendable {
    enum Severity: Sendable {
        case hard
        case soft
    }

    let id = UUID()
    let severity: Severity
    let message: String
    let scheduleTableLegacyID: String?
    let gridKey: String?
}

struct ConflictCheckResult: Sendable {
    var issues: [ConflictIssue]
    var checkedAt: Date

    var hardIssues: [ConflictIssue] {
        issues.filter { $0.severity == .hard }
    }

    var softIssues: [ConflictIssue] {
        issues.filter { $0.severity == .soft }
    }
}

protocol ConflictEngine: Sendable {
    func check(request: ConflictCheckRequest) async throws -> ConflictCheckResult
}
