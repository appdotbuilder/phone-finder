import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { useState, useCallback } from 'react';
import type { PhoneWithLocation, RegisterPhoneInput, UpdateLocationInput } from '../../server/src/schema';

function App() {
  const [phoneData, setPhoneData] = useState<PhoneWithLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Form states
  const [registerForm, setRegisterForm] = useState<RegisterPhoneInput>({
    device_id: '',
    device_name: '',
    phone_number: null
  });

  const [locationForm, setLocationForm] = useState<UpdateLocationInput>({
    device_id: '',
    latitude: 0,
    longitude: 0,
    accuracy: null,
    altitude: null,
    battery_level: null
  });

  const [trackingDeviceId, setTrackingDeviceId] = useState<string>('');

  const clearMessages = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  // Register a new phone
  const handleRegisterPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearMessages();
    
    try {
      const result = await trpc.registerPhone.mutate(registerForm);
      setSuccess(`📱 Phone "${result.device_name}" registered successfully! Device ID: ${result.device_id}`);
      setRegisterForm({
        device_id: '',
        device_name: '',
        phone_number: null
      });
    } catch (err) {
      setError(`❌ Registration failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Update phone location
  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearMessages();
    
    try {
      await trpc.updateLocation.mutate(locationForm);
      setSuccess(`📍 Location updated successfully for device ${locationForm.device_id}`);
      setLocationForm({
        device_id: '',
        latitude: 0,
        longitude: 0,
        accuracy: null,
        altitude: null,
        battery_level: null
      });
    } catch (err) {
      setError(`❌ Location update failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Track phone location
  const handleTrackPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearMessages();
    
    try {
      const result = await trpc.getPhoneLocation.query({ device_id: trackingDeviceId });
      setPhoneData(result);
      setSuccess(`🎯 Successfully located device: ${result.device_name}`);
    } catch (err) {
      setError(`❌ Tracking failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setPhoneData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📱 Phone Tracker</h1>
          <p className="text-xl text-gray-600">Locate your devices with enhanced error handling & transactions</p>
        </div>

        {/* Status Messages */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTitle className="text-red-800">Error</AlertTitle>
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertTitle className="text-green-800">Success</AlertTitle>
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Register Phone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📝 Register Phone
              </CardTitle>
              <CardDescription>
                Add a new device to the tracking system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegisterPhone} className="space-y-4">
                <Input
                  placeholder="Device ID (e.g., IMEI or UUID)"
                  value={registerForm.device_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRegisterForm((prev: RegisterPhoneInput) => ({ ...prev, device_id: e.target.value }))
                  }
                  required
                />
                <Input
                  placeholder="Device Name (e.g., John's iPhone)"
                  value={registerForm.device_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRegisterForm((prev: RegisterPhoneInput) => ({ ...prev, device_name: e.target.value }))
                  }
                  required
                />
                <Input
                  placeholder="Phone Number (optional)"
                  value={registerForm.phone_number || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRegisterForm((prev: RegisterPhoneInput) => ({ 
                      ...prev, 
                      phone_number: e.target.value || null 
                    }))
                  }
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? '⏳ Registering...' : '📝 Register Device'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Update Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📍 Update Location
              </CardTitle>
              <CardDescription>
                Send location data for a registered device
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateLocation} className="space-y-4">
                <Input
                  placeholder="Device ID"
                  value={locationForm.device_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setLocationForm((prev: UpdateLocationInput) => ({ ...prev, device_id: e.target.value }))
                  }
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Latitude"
                    value={locationForm.latitude}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLocationForm((prev: UpdateLocationInput) => ({ 
                        ...prev, 
                        latitude: parseFloat(e.target.value) || 0 
                      }))
                    }
                    step="any"
                    required
                  />
                  <Input
                    type="number"
                    placeholder="Longitude"
                    value={locationForm.longitude}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLocationForm((prev: UpdateLocationInput) => ({ 
                        ...prev, 
                        longitude: parseFloat(e.target.value) || 0 
                      }))
                    }
                    step="any"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="Accuracy (m)"
                    value={locationForm.accuracy || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLocationForm((prev: UpdateLocationInput) => ({ 
                        ...prev, 
                        accuracy: parseFloat(e.target.value) || null 
                      }))
                    }
                    step="any"
                  />
                  <Input
                    type="number"
                    placeholder="Altitude (m)"
                    value={locationForm.altitude || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLocationForm((prev: UpdateLocationInput) => ({ 
                        ...prev, 
                        altitude: parseFloat(e.target.value) || null 
                      }))
                    }
                    step="any"
                  />
                  <Input
                    type="number"
                    placeholder="Battery %"
                    value={locationForm.battery_level || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLocationForm((prev: UpdateLocationInput) => ({ 
                        ...prev, 
                        battery_level: parseInt(e.target.value) || null 
                      }))
                    }
                    min="0"
                    max="100"
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? '⏳ Updating...' : '📍 Update Location'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Track Phone */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎯 Track Phone
            </CardTitle>
            <CardDescription>
              Find the last known location of a registered device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrackPhone} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter Device ID to track"
                  value={trackingDeviceId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTrackingDeviceId(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? '⏳ Tracking...' : '🎯 Track'}
                </Button>
              </div>
            </form>

            {phoneData && (
              <div className="mt-6 p-4 bg-white rounded-lg border">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{phoneData.device_name}</h3>
                    <p className="text-sm text-gray-600">ID: {phoneData.device_id}</p>
                    {phoneData.phone_number && (
                      <p className="text-sm text-gray-600">📞 {phoneData.phone_number}</p>
                    )}
                  </div>
                  <Badge variant="outline">
                    Last seen: {phoneData.last_seen_at.toLocaleString()}
                  </Badge>
                </div>

                {phoneData.last_location ? (
                  <div className="space-y-2">
                    <h4 className="font-medium text-green-800">📍 Last Known Location:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Latitude:</span><br />
                        {phoneData.last_location.latitude.toFixed(6)}
                      </div>
                      <div>
                        <span className="font-medium">Longitude:</span><br />
                        {phoneData.last_location.longitude.toFixed(6)}
                      </div>
                      {phoneData.last_location.accuracy && (
                        <div>
                          <span className="font-medium">Accuracy:</span><br />
                          ±{phoneData.last_location.accuracy.toFixed(1)}m
                        </div>
                      )}
                      {phoneData.last_location.battery_level && (
                        <div>
                          <span className="font-medium">Battery:</span><br />
                          🔋 {phoneData.last_location.battery_level}%
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      📅 Recorded: {phoneData.last_location.timestamp.toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500">📍 No location data available for this device</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Send location updates to see the device on the map
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Features Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">✨ Enhanced Features</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">🔄 Database Transactions:</span>
              <span>All operations use transactions to ensure data consistency</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">🛡️ Enhanced Error Handling:</span>
              <span>Detailed error messages for debugging and user guidance</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">📝 Comprehensive Logging:</span>
              <span>All operations are logged with context for troubleshooting</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">🔒 Data Validation:</span>
              <span>Input validation prevents invalid coordinates and data corruption</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;