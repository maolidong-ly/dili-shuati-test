import Foundation

/// Local feature toggles for staged rollout (v1.0 defaults).
enum FeatureFlags {
    /// iCloud sync (not in v1.0).
    static let iCloudSyncEnabled = false

    /// Advanced auto-schedule constraints (v1.1+).
    static let advancedSchedulingConstraints = false

    /// PDF export quality pass.
    static let enhancedPDFExport = false

    /// Touch ID / app password gate.
    static let optionalAppLock = false

    /// Run legacy-shaped import on launch (debug only).
    static let debugLegacyImportOnLaunch = false
}
