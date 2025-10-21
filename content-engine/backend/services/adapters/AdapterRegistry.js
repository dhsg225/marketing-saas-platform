/**
 * AdapterRegistry - Central registry for all AI provider adapters
 * 
 * This registry dynamically loads adapters based on the adapter_module
 * specified in model_configs. It ensures that only valid adapters are used.
 */

const BaseAdapter = require('./BaseAdapter');
const ApiframeAdapter = require('./ApiframeAdapter');
const DalleAdapter = require('./DalleAdapter');

class AdapterRegistry {
  constructor() {
    // Register all available adapters
    this.adapters = new Map();
    this._registerDefaultAdapters();
  }

  /**
   * Register the default adapters shipped with the platform
   * @private
   */
  _registerDefaultAdapters() {
    this.register('ApiframeAdapter', ApiframeAdapter);
    this.register('DalleAdapter', DalleAdapter);
    
    console.log(`📦 [AdapterRegistry] Registered ${this.adapters.size} adapters`);
  }

  /**
   * Register a new adapter
   * 
   * @param {string} name - Adapter name (must match adapter_module in model_configs)
   * @param {Class} AdapterClass - The adapter class (must extend BaseAdapter)
   */
  register(name, AdapterClass) {
    // Validate that AdapterClass extends BaseAdapter
    if (!(AdapterClass.prototype instanceof BaseAdapter)) {
      throw new Error(`Adapter ${name} must extend BaseAdapter`);
    }
    
    this.adapters.set(name, AdapterClass);
    console.log(`✅ [AdapterRegistry] Registered adapter: ${name}`);
  }

  /**
   * Get an adapter instance for a model configuration
   * 
   * @param {Object} modelConfig - Model configuration from database
   * @returns {BaseAdapter} Instance of the appropriate adapter
   * @throws {Error} If adapter is not found or invalid
   */
  getAdapter(modelConfig) {
    const adapterModule = modelConfig.adapter_module;
    
    if (!adapterModule) {
      throw new Error('Model configuration missing adapter_module');
    }
    
    const AdapterClass = this.adapters.get(adapterModule);
    
    if (!AdapterClass) {
      throw new Error(
        `Adapter "${adapterModule}" not found. ` +
        `Available adapters: ${Array.from(this.adapters.keys()).join(', ')}`
      );
    }
    
    // Create and return new instance
    const adapter = new AdapterClass();
    
    // Validate the config with the adapter
    const validation = adapter.validateConfig(modelConfig);
    if (!validation.valid) {
      throw new Error(
        `Invalid configuration for ${adapterModule}: ${validation.errors.join(', ')}`
      );
    }
    
    return adapter;
  }

  /**
   * Check if an adapter is registered
   * 
   * @param {string} name - Adapter name
   * @returns {boolean}
   */
  hasAdapter(name) {
    return this.adapters.has(name);
  }

  /**
   * Get list of all registered adapter names
   * 
   * @returns {Array<string>}
   */
  listAdapters() {
    return Array.from(this.adapters.keys());
  }

  /**
   * Unregister an adapter (useful for testing)
   * 
   * @param {string} name - Adapter name
   */
  unregister(name) {
    this.adapters.delete(name);
  }
}

// Export singleton instance
module.exports = new AdapterRegistry();

