import Foundation
import SwiftData

struct LegacyBackupImporter: LegacyBackupImporting {
    func preview(data: Data) async throws -> (LegacyFullBackupMetadata, LegacyImportSummary) {
        let parsed = try LegacyBackupParser.parse(data: data)
        return (parsed.metadata, LegacyBackupParser.summary(for: parsed))
    }

    func importFullBackup(data: Data, context: ModelContext) async throws -> LegacyImportSummary {
        let parsed = try LegacyBackupParser.parse(data: data)
        try clearLegacyCatalog(in: context)
        try persist(parsed, in: context)
        if let currentTableID = parsed.metadata.currentTableID {
            UserDefaults.standard.set(currentTableID, forKey: LegacyBackupImporter.currentTableUserDefaultsKey)
        }
        try context.save()
        return LegacyBackupParser.summary(for: parsed)
    }

    static let currentTableUserDefaultsKey = "paike.legacy.currentTableId"

    private func clearLegacyCatalog(in context: ModelContext) throws {
        try deleteAll(ScheduleTable.self, in: context)
        try deleteAll(ClassInfo.self, in: context)
        try deleteAll(Teacher.self, in: context)
        try deleteAll(Room.self, in: context)
        try deleteAll(CourseOffering.self, in: context)
        try deleteAll(TimeTemplate.self, in: context)
    }

    private func deleteAll<T: PersistentModel>(_ type: T.Type, in context: ModelContext) throws {
        let descriptor = FetchDescriptor<T>()
        let items = try context.fetch(descriptor)
        for item in items {
            context.delete(item)
        }
    }

    private func persist(_ backup: LegacyParsedFullBackup, in context: ModelContext) throws {
        for (index, template) in backup.templates.enumerated() {
            let timeListJSON = try LegacyBackupParser.encodeTimeListJSON(template.timeList)
            context.insert(
                TimeTemplate(
                    name: template.name,
                    timeListJSON: timeListJSON,
                    isHiddenBuiltin: template.isHiddenBuiltin
                )
            )
            _ = index
        }

        for (index, classEntry) in backup.classes.enumerated() {
            context.insert(
                ClassInfo(
                    name: classEntry.name,
                    grade: classEntry.grade,
                    defaultPeriodTemplateRef: backup.classTemplatePrefs[classEntry.name],
                    sortOrder: index
                )
            )
        }

        for (index, name) in backup.teachers.enumerated() {
            context.insert(Teacher(name: name, sortOrder: index))
        }

        for (index, name) in backup.rooms.enumerated() {
            context.insert(Room(name: name, sortOrder: index))
        }

        for (index, course) in backup.courses.enumerated() {
            context.insert(
                CourseOffering(
                    name: course.name,
                    teacherName: course.teacherName,
                    roomName: course.roomName,
                    className: course.className,
                    sortOrder: index
                )
            )
        }

        for (index, table) in backup.tables.enumerated() {
            let timeListJSON = try LegacyBackupParser.encodeTimeListJSON(table.timeList)
            let scheduleTable = ScheduleTable(
                legacyID: table.id,
                name: table.name,
                bindClassName: table.bindClass,
                periodTemplateRef: table.periodTemplateRef,
                timeListJSON: timeListJSON,
                onlyEmpty: table.onlyEmpty,
                checkGlobal: table.checkGlobal,
                spreadWeek: table.spreadWeek,
                sortOrder: index
            )
            context.insert(scheduleTable)

            for cell in table.cells {
                let lesson = LessonCell(
                    rowIndex: cell.rowIndex,
                    weekIndex: cell.weekIndex,
                    courseName: cell.courseName,
                    teacherName: cell.teacherName,
                    roomName: cell.roomName,
                    className: cell.className,
                    customStart: cell.customStart,
                    customEnd: cell.customEnd,
                    scheduleTable: scheduleTable
                )
                context.insert(lesson)
            }
        }
    }
}
