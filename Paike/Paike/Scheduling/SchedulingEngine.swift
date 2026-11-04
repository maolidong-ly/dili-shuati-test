import Foundation

struct AutoScheduleTableTarget: Identifiable, Sendable {
    let id: String
    var legacyTableID: String
    var onlyEmpty: Bool
}

struct AutoScheduleRequest: Sendable {
    var targets: [AutoScheduleTableTarget]
    var checkGlobal: Bool
    var spreadWeek: Bool
}

struct AutoScheduleTableReport: Sendable {
    var legacyTableID: String
    var placedCount: Int
    var unplacedCourseNames: [String]
    var feasibilitySummary: String
}

struct AutoScheduleResult: Sendable {
    var reports: [AutoScheduleTableReport]
    var finishedAt: Date
}

protocol SchedulingEngine: Sendable {
    func runAutoSchedule(request: AutoScheduleRequest) async throws -> AutoScheduleResult
}
