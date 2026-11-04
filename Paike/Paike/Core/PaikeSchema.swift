import SwiftData

enum PaikeSchemaV1: VersionedSchema {
    static var versionIdentifier = Schema.Version(1, 0, 0)

    static var models: [any PersistentModel.Type] {
        [
            ScheduleTable.self,
            ClassInfo.self,
            Teacher.self,
            Room.self,
            CourseOffering.self,
            TimeTemplate.self,
            LessonCell.self,
            LessonPackage.self,
            ConsumptionLedger.self,
        ]
    }
}

enum PaikeMigrationPlan: SchemaMigrationPlan {
    static var schemas: [any VersionedSchema.Type] {
        [PaikeSchemaV1.self]
    }

    static var stages: [MigrationStage] { [] }
}
