import * as L from "leaflet";

declare module "leaflet" {
  interface Marker {
    slideTo(
      latlng: L.LatLngExpression,
      options?: {
        duration?: number;
        keepAtCenter?: boolean;
        easeLinearity?: number;
      }
    ): void;
  }
}
