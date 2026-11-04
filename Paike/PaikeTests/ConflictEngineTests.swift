import XCTest
@testable import Paike

final class ConflictEngineTests: XCTestCase {
    private let engine = DefaultConflictEngine()

    private let defaultTimeListJSON = """
    [
      {"name":"第1节 08:00-09:00","isSplit":false},
      {"name":"午休","isSplit":true},
      {"name":"第2节 10:00-11:00","isSplit":false}
    ]
    """

    func testEmptyScheduleProducesNoIssues() async throws {
        let table = makeTable(id: "t1", cells: [])
        let result = try await runCheck(tables: [table], selected: ["t1"])
        XCTAssertTrue(result.issues.isEmpty)
    }

    func testSameTeacherSameSlotSameTableHardConflict() async throws {
        let cells = [
            cell(row: 0, week: 0, course: "语文", teacher: "张老师", room: "101", cls: "A班"),
            cell(row: 0, week: 0, course: "数学", teacher: "张老师", room: "102", cls: "A班"),
        ]
        let table = makeTable(id: "t1", cells: cells)
        let result = try await runCheck(tables: [table], selected: ["t1"])
        XCTAssertFalse(result.hardIssues.isEmpty)
        XCTAssertTrue(result.hardIssues.contains { $0.message.contains("教师") })
    }

    func testSameRoomOverlapHardConflict() async throws {
        let cells = [
            cell(row: 0, week: 1, course: "英语", teacher: "王老师", room: "201", cls: "A班"),
            cell(row: 0, week: 1, course: "物理", teacher: "李老师", room: "201", cls: "B班"),
        ]
        let result = try await runCheck(tables: [makeTable(id: "t1", cells: cells)], selected: ["t1"])
        XCTAssertTrue(result.hardIssues.contains { $0.message.contains("教室") })
    }

    func testSameClassOverlapUsesBindClassWhenCellClassEmpty() async throws {
        let cells = [
            cell(row: 0, week: 0, course: "语文", teacher: "张老师", room: "101", cls: ""),
            cell(row: 0, week: 0, course: "数学", teacher: "李老师", room: "102", cls: ""),
        ]
        let table = makeTable(id: "t1", bindClass: "高一1班", cells: cells)
        let result = try await runCheck(tables: [table], selected: ["t1"])
        XCTAssertTrue(result.hardIssues.contains { $0.message.contains("班级") })
    }

    func testCrossTableTeacherConflictWhenGlobalEnabled() async throws {
        let tableA = makeTable(
            id: "a",
            name: "表A",
            cells: [cell(row: 0, week: 0, course: "语文", teacher: "张老师", room: "101", cls: "A班")]
        )
        let tableB = makeTable(
            id: "b",
            name: "表B",
            cells: [cell(row: 0, week: 0, course: "数学", teacher: "张老师", room: "201", cls: "B班")]
        )
        let result = try await runCheck(
            tables: [tableA, tableB],
            selected: ["a"],
            includeGlobal: true
        )
        XCTAssertFalse(result.hardIssues.isEmpty)
        XCTAssertTrue(result.hardIssues[0].message.contains("跨课表"))
    }

    func testCrossTableSkippedWhenGlobalDisabledAndSingleTableScope() async throws {
        let tableA = makeTable(
            id: "a",
            cells: [cell(row: 0, week: 0, course: "语文", teacher: "张老师", room: "101", cls: "A班")]
        )
        let tableB = makeTable(
            id: "b",
            checkGlobal: false,
            cells: [cell(row: 0, week: 0, course: "数学", teacher: "张老师", room: "201", cls: "B班")]
        )
        let result = try await runCheck(
            tables: [tableA, tableB],
            selected: ["a"],
            includeGlobal: false
        )
        XCTAssertTrue(result.hardIssues.isEmpty)
    }

    func testCustomTimeOverlapAcrossDifferentRows() async throws {
        let cells = [
            cell(row: 0, week: 2, course: "早读", teacher: "张老师", room: "101", cls: "A班"),
            cell(
                row: 2,
                week: 2,
                course: "加课",
                teacher: "李老师",
                room: "102",
                cls: "A班",
                customStart: "08:30",
                customEnd: "09:30"
            ),
        ]
        let result = try await runCheck(tables: [makeTable(id: "t1", cells: cells)], selected: ["t1"])
        XCTAssertTrue(result.hardIssues.contains { $0.message.contains("班级") })
    }

    func testNonOverlappingSameTeacherDifferentSlotsNoConflict() async throws {
        let cells = [
            cell(row: 0, week: 0, course: "语文", teacher: "张老师", room: "101", cls: "A班"),
            cell(row: 2, week: 0, course: "数学", teacher: "张老师", room: "101", cls: "A班"),
        ]
        let result = try await runCheck(tables: [makeTable(id: "t1", cells: cells)], selected: ["t1"])
        XCTAssertTrue(result.hardIssues.isEmpty)
    }

    func testTeacherDailyLoadSoftWarning() async throws {
        let cells = (0 ..< 4).map { index in
            cell(row: 0, week: 0, course: "课\(index)", teacher: "张老师", room: "10\(index)", cls: "A班")
        }
        let request = ConflictCheckRequest.make(
            tables: [makeTable(id: "t1", cells: cells)],
            scope: .selectedTables,
            scheduleTableLegacyIDs: ["t1"],
            includeGlobalCrossTable: false,
            teacherDailyLoadThreshold: 3
        )
        let result = try await engine.check(request: request)
        XCTAssertEqual(result.softIssues.count, 1)
        XCTAssertTrue(result.softIssues[0].message.contains("超过建议上限"))
    }

    func testTimeListParsingFromRowName() {
        let interval = ConflictTimeParsing.intervalFromTimeListName("第1节 08:20-10:20")
        XCTAssertEqual(interval?.startMinutes, 8 * 60 + 20)
        XCTAssertEqual(interval?.endMinutes, 10 * 60 + 20)
    }

    // MARK: - Helpers

    private func runCheck(
        tables: [ConflictScheduleTableSnapshot],
        selected: [String],
        includeGlobal: Bool = false
    ) async throws -> ConflictCheckResult {
        let request = ConflictCheckRequest.make(
            tables: tables,
            scope: .selectedTables,
            scheduleTableLegacyIDs: selected,
            includeGlobalCrossTable: includeGlobal
        )
        return try await engine.check(request: request)
    }

    private func makeTable(
        id: String,
        name: String = "测试表",
        bindClass: String = "A班",
        checkGlobal: Bool = true,
        cells: [ConflictLessonCellSnapshot]
    ) -> ConflictScheduleTableSnapshot {
        ConflictScheduleTableSnapshot(
            legacyID: id,
            name: name,
            bindClassName: bindClass,
            timeListJSON: defaultTimeListJSON,
            checkGlobal: checkGlobal,
            cells: cells
        )
    }

    private func cell(
        row: Int,
        week: Int,
        course: String,
        teacher: String,
        room: String,
        cls: String,
        customStart: String? = nil,
        customEnd: String? = nil
    ) -> ConflictLessonCellSnapshot {
        ConflictLessonCellSnapshot(
            rowIndex: row,
            weekIndex: week,
            courseName: course,
            teacherName: teacher,
            roomName: room,
            className: cls,
            customStart: customStart,
            customEnd: customEnd
        )
    }
}
