export interface Coordinate {
  latitude: number;
  longitude: number;
}

class RoutingServiceProvider {
  private readonly baseUrl = 'https://router.project-osrm.org/route/v1/driving/';

  /**
   * Fetches a route between two coordinates using OSRM.
   * Returns an array of coordinates for the route polyline.
   */
  public async getRoute(source: Coordinate, destination: Coordinate): Promise<Coordinate[]> {
    try {
      // OSRM expects coordinates in lng,lat format
      const coordinates = `${source.longitude},${source.latitude};${destination.longitude},${destination.latitude}`;
      const url = `${this.baseUrl}${coordinates}?overview=full&geometries=geojson`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No route found');
      }

      // GeoJSON returns [lng, lat]
      const path: [number, number][] = data.routes[0].geometry.coordinates;
      
      return path.map((point) => ({
        latitude: point[1],
        longitude: point[0],
      }));
    } catch (error) {
      console.error('Error fetching route:', error);
      return [];
    }
  }
}

export const RoutingService = new RoutingServiceProvider();
