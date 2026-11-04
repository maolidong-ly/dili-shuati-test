import Foundation

struct StubSchedulingEngine: SchedulingEngine {
    func runAutoSchedule(request: AutoScheduleRequest) async throws -> AutoScheduleResult {
        let reports = request.targets.map { target in
            AutoScheduleTableReport(
                legacyTableID: target.legacyTableID,
                placedCount: 0,
                unplacedCourseNames: [],
                feasibilitySummary: "Stub engine — auto-schedule not implemented."
            )
        }
        return AutoScheduleResult(reports: reports, finishedAt: .now)
    }
}
