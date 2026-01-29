module.exports = db => {
  const {
    Users,
    SeniorCaregiverMapping,
    CaregiverInvitations,
    Devices,
    UserDeviceMapping,
    AuditLogs,
    NotificationLogs,
    EventNotificationLogs,
    MedicationReminders,
    Goals,
  } = db;

  // Users associations
  // Note: Users can be both senior and caregiver, so we need separate associations
  // Check if associations already exist to avoid duplicates
  if (!Users.associations.seniorMappings) {
    Users.hasMany(SeniorCaregiverMapping, {
      foreignKey: 'senior_id',
      as: 'seniorMappings',
    });
  }
  if (!Users.associations.caregiverMappings) {
    Users.hasMany(SeniorCaregiverMapping, {
      foreignKey: 'caregiver_id',
      as: 'caregiverMappings',
    });
  }
  if (!Users.associations.deviceMappings) {
    Users.hasMany(UserDeviceMapping, {
      foreignKey: 'user_id',
      as: 'deviceMappings',
    });
  }
  if (!Users.associations.auditLogs) {
    Users.hasMany(AuditLogs, {
      foreignKey: 'user_id',
      as: 'auditLogs',
    });
  }
  if (!Users.associations.notifications) {
    Users.hasMany(NotificationLogs, {
      foreignKey: 'recipient_id',
      as: 'notifications',
    });
  }
  if (!Users.associations.medicationReminders) {
    Users.hasMany(MedicationReminders, {
      foreignKey: 'user_id',
      as: 'medicationReminders',
    });
  }
  if (!Users.associations.goals) {
    Users.hasMany(Goals, {
      foreignKey: 'user_id',
      as: 'goals',
    });
  }
  if (!Users.associations.sentInvitations) {
    Users.hasMany(CaregiverInvitations, {
      foreignKey: 'inviter_user_id',
      as: 'sentInvitations',
    });
  }

  // SeniorCaregiverMapping associations
  if (!SeniorCaregiverMapping.associations.senior) {
    SeniorCaregiverMapping.belongsTo(Users, {
      foreignKey: 'senior_id',
      as: 'senior',
    });
  }
  if (!SeniorCaregiverMapping.associations.caregiver) {
    SeniorCaregiverMapping.belongsTo(Users, {
      foreignKey: 'caregiver_id',
      as: 'caregiver',
    });
  }

  // UserDeviceMapping associations
  if (!UserDeviceMapping.associations.user) {
    UserDeviceMapping.belongsTo(Users, {
      foreignKey: 'user_id',
      as: 'user',
    });
  }
  if (!UserDeviceMapping.associations.device) {
    UserDeviceMapping.belongsTo(Devices, {
      foreignKey: 'device_id',
      as: 'device',
    });
  }

  // Devices associations
  if (!Devices.associations.userMappings) {
    Devices.hasMany(UserDeviceMapping, {
      foreignKey: 'device_id',
      as: 'userMappings',
    });
  }

  // AuditLogs associations
  if (!AuditLogs.associations.user) {
    AuditLogs.belongsTo(Users, {
      foreignKey: 'user_id',
      as: 'user',
    });
  }

  // NotificationLogs associations
  if (!NotificationLogs.associations.recipient) {
    NotificationLogs.belongsTo(Users, {
      foreignKey: 'recipient_id',
      as: 'recipient',
    });
  }

  // EventNotificationLogs associations
  if (!EventNotificationLogs.associations.caregiver) {
    EventNotificationLogs.belongsTo(Users, {
      foreignKey: 'caregiver_id',
      as: 'caregiver',
    });
  }
  if (!EventNotificationLogs.associations.senior) {
    EventNotificationLogs.belongsTo(Users, {
      foreignKey: 'senior_id',
      as: 'senior',
    });
  }
  if (!Users.associations.eventNotificationsAsCaregiver) {
    Users.hasMany(EventNotificationLogs, {
      foreignKey: 'caregiver_id',
      as: 'eventNotificationsAsCaregiver',
    });
  }
  if (!Users.associations.eventNotificationsAsSenior) {
    Users.hasMany(EventNotificationLogs, {
      foreignKey: 'senior_id',
      as: 'eventNotificationsAsSenior',
    });
  }

  // MedicationReminders associations
  if (!MedicationReminders.associations.user) {
    MedicationReminders.belongsTo(Users, {
      foreignKey: 'user_id',
      as: 'user',
    });
  }

  // Goals associations
  if (!Goals.associations.user) {
    Goals.belongsTo(Users, {
      foreignKey: 'user_id',
      as: 'user',
    });
  }

  // CaregiverInvitations associations
  if (!CaregiverInvitations.associations.inviter) {
    CaregiverInvitations.belongsTo(Users, {
      foreignKey: 'inviter_user_id',
      as: 'inviter',
    });
  }
};
