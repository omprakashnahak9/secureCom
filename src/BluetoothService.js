// Bluetooth service configuration
export const CHAT_SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
export const MESSAGE_CHARACTERISTIC_UUID = '87654321-4321-4321-4321-cba987654321';

export class BluetoothChatService {
  constructor() {
    this.device = null;
    this.server = null;
    this.service = null;
    this.characteristic = null;
    this.isConnected = false;
    this.onMessageReceived = null;
    this.onConnectionChanged = null;
  }

  async requestDevice() {
    try {
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [CHAT_SERVICE_UUID]
      });

      this.device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnection();
      });

      return this.device;
    } catch (error) {
      throw new Error(`Device request failed: ${error.message}`);
    }
  }

  async connect(device = null) {
    try {
      const targetDevice = device || this.device;
      if (!targetDevice) {
        throw new Error('No device available');
      }

      this.server = await targetDevice.gatt.connect();
      
      // Try to get existing service or create advertisement
      try {
        this.service = await this.server.getPrimaryService(CHAT_SERVICE_UUID);
        this.characteristic = await this.service.getCharacteristic(MESSAGE_CHARACTERISTIC_UUID);
        
        // Start notifications for incoming messages
        await this.characteristic.startNotifications();
        this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
          this.handleIncomingMessage(event);
        });
        
      } catch (serviceError) {
        // Service not found, this device might need to advertise
        console.log('Service not found, device may need to advertise');
      }

      this.isConnected = true;
      this.onConnectionChanged?.(true);
      
      return true;
    } catch (error) {
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  async sendMessage(encryptedMessage) {
    if (!this.characteristic || !this.isConnected) {
      throw new Error('Not connected to a device');
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(encryptedMessage);
      await this.characteristic.writeValue(data);
      return true;
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  handleIncomingMessage(event) {
    const value = event.target.value;
    const encryptedMessage = new TextDecoder().decode(value);
    this.onMessageReceived?.(encryptedMessage);
  }

  handleDisconnection() {
    this.isConnected = false;
    this.device = null;
    this.server = null;
    this.service = null;
    this.characteristic = null;
    this.onConnectionChanged?.(false);
  }

  disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
  }

  // Check if Web Bluetooth is supported
  static isSupported() {
    return 'bluetooth' in navigator;
  }

  // Get available devices (for future enhancement)
  async getAvailableDevices() {
    try {
      const devices = await navigator.bluetooth.getDevices();
      return devices;
    } catch (error) {
      console.log('Could not get devices:', error);
      return [];
    }
  }
}