
/**
 * Auto Creation Service
 * Automatically creates missing offices and positions during import
 */

class AutoCreationService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get or create office by name
   */
  async getOrCreateOffice(officeName) {
    if (!officeName || officeName.trim() === '') {
      // Create default office
      officeName = 'Default Office';
    }

    try {
      // Try to find existing office (case-insensitive)
      const [existing] = await this.db.query(
        'SELECT id FROM offices WHERE LOWER(name) = LOWER(?)', 
        [officeName.trim()]
      );

      if (existing && existing[0]) {
        return existing[0].id;
      }

      // Create new office
      const [result] = await this.db.query(
        'INSERT INTO offices (name, location, created_at) VALUES (?, ?, NOW())',
        [officeName.trim(), 'Auto-created during import']
      );

      console.log(`   📍 Created new office: "${officeName}"`);
      return result.insertId;
    } catch (error) {
      console.error('Error creating office:', error);
      // Return a default office ID if creation fails
      return 1;
    }
  }

  /**
   * Get or create position by title
   */
  async getOrCreatePosition(positionTitle) {
    if (!positionTitle || positionTitle.trim() === '') {
      // Create default position
      positionTitle = 'General Employee';
    }

    try {
      // Try to find existing position (case-insensitive)
      const [existing] = await this.db.query(
        'SELECT id FROM positions WHERE LOWER(title) = LOWER(?)', 
        [positionTitle.trim()]
      );

      if (existing && existing[0]) {
        return existing[0].id;
      }

      // Create new position
      const [result] = await this.db.query(
        'INSERT INTO positions (title, description, created_at) VALUES (?, ?, NOW())',
        [positionTitle.trim(), 'Auto-created during import']
      );

      console.log(`   💼 Created new position: "${positionTitle}"`);
      return result.insertId;
    } catch (error) {
      console.error('Error creating position:', error);
      // Return a default position ID if creation fails
      return 1;
    }
  }

  /**
   * Resolve office name to ID with auto-creation
   */
  async resolveOfficeNameToId(officeName, db) {
    return await this.getOrCreateOffice(officeName);
  }

  /**
   * Resolve position name to ID with auto-creation
   */
  async resolvePositionNameToId(positionName, db) {
    return await this.getOrCreatePosition(positionName);
  }
}

module.exports = AutoCreationService;
