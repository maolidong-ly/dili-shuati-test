import XCTest
@testable import Paike

final class LegacyBackupParserTests: XCTestCase {
    func testParseFullBackupSampleFixture() throws {
        let data = try loadFixture(named: "fullBackup.sample.json")
        let backup = try LegacyBackupParser.parse(data: data)

        XCTAssertEqual(backup.metadata.backupType, "fullBackup")
        XCTAssertEqual(backup.metadata.currentTableID, "table_example")
        XCTAssertEqual(backup.tables.count, 1)

        let table = try XCTUnwrap(backup.tables.first)
        XCTAssertEqual(table.id, "table_example")
        XCTAssertEqual(table.bindClass, "高一1班")
        XCTAssertEqual(table.cells.count, 2)

        let sixSegment = try XCTUnwrap(table.cells.first { $0.rowIndex == 1 && $0.weekIndex == 2 })
        XCTAssertEqual(sixSegment.courseName, "数学")
        XCTAssertEqual(sixSegment.customStart, "09:00")
        XCTAssertEqual(sixSegment.customEnd, "10:30")

        XCTAssertEqual(backup.classes.count, 2)
        XCTAssertEqual(backup.classes[1].name, "旧格式班级")
        XCTAssertEqual(backup.teachers.count, 2)
        XCTAssertEqual(backup.courses.count, 2, "repairCourseList should add 数学 from grid")

        let hidden = try XCTUnwrap(backup.templates.first { $0.name == "default" })
        XCTAssertFalse(hidden.isHiddenBuiltin)
    }

    func testParseStringEncodedBulkArrays() throws {
        let innerTables: [[String: Any]] = [
            [
                "id": "t1",
                "name": "表1",
                "bindClass": "A班",
                "data": ["0-1": "英语|王老师|201|A班"],
                "timeList": [["name": "第1节", "isSplit": false]],
            ],
        ]
        let tableData = try JSONSerialization.data(withJSONObject: innerTables)
        let payload: [String: Any] = [
            "backupType": "fullBackup",
            "multiTableData": String(data: tableData, encoding: .utf8)!,
            "classList": "[\"A班\"]",
            "teacherList": "[\"王老师\"]",
            "roomList": "[\"201\"]",
            "courseList": "[]",
            "timeTemplateList": "[]",
        ]
        let data = try JSONSerialization.data(withJSONObject: payload)
        let backup = try LegacyBackupParser.parse(data: data)

        XCTAssertEqual(backup.tables.count, 1)
        XCTAssertEqual(backup.classes.first?.name, "A班")
        XCTAssertEqual(backup.teachers, ["王老师"])
    }

    func testInvalidBackupTypeThrows() {
        let data = Data("""
        {"backupType":"singleTableBackup"}
        """.utf8)
        XCTAssertThrowsError(try LegacyBackupParser.parse(data: data)) { error in
            guard case LegacyImportError.invalidBackupType(let type) = error else {
                return XCTFail("Expected invalidBackupType, got \(error)")
            }
            XCTAssertEqual(type, "singleTableBackup")
        }
    }

    private func loadFixture(named filename: String) throws -> Data {
        let url = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("Resources/Fixtures/\(filename)")
        return try Data(contentsOf: url)
    }
}
