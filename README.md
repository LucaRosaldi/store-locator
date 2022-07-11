# Store Locator

Responsive Google Maps Store locator build in [Preact](https://preactjs.com/) and Google Maps. Forked and improved from [Microapps](https://microapps.com/)’s fantastic [Store Locator](https://github.com/microapps/store-locator).

![Gif](docs/demo.gif?raw=true)

[Live Demo](https://lucarosaldi.github.io/store-locator/)



## Features

- show a interactive sidebar with list of all stores
- show links in each store for **directions**,  **phone**, **email** and/or **website**
- show **thumbnails** for each store
- use browser geolocation to set the current location of the user
- search box with **address suggestion** dropdown
- **sort stores from the nearest to the farthest** and show distance (Km or Mi, walking or driving)
- set **custom markers** (globally or even for single stores)
- set **[custom map styles](https://mapstyle.withgoogle.com/)**
- fully translatable for **internationalization**
- fully responsive and easily customizable with CSS



## CDN

```html
<link href="https://cdn.jsdelivr.net/gh/lucarosaldi/store-locator/dist/store-locator.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/gh/lucarosaldi/store-locator/dist/store-locator.js"></script>
```



## Usage

- Include [store-locator.js](/dist/store-locator.js?raw=true) and [store-locator.css](/dist/store-locator.css?raw=true) on your page
- Add a container where you want the map to be rendered
- Initialize the script


```html
<html>

  <head>
    <link href="store-locator.css" rel="stylesheet">
  </head>

  <body>

    <div id="my-store-locator"></div>

    <script src="store-locator.js"></script>
    <script>
    (function(){

      var config = {};

      config.container = document.getElementById( 'my-store-locator' );
      config.apiKey = 'GOOGLE_MAPS_API_KEY';

      config.stores: [
        {
          name: 'Coliseum',
          address: 'Piazza del Colosseo, 1, 00184 Roma RM',
          location: { lat: 41.8902142, lng: 12.4900422 },
          summary: 'Text displayed in the stores list.'
          description: 'Text displayed in the map when a marker is clicked.',
          phone: '+39 1234567',
          email: 'email@example.com',
          website: 'https://coliseum.com'
        },
        ...
      ];

      storeLocator( config );

    })();
    </script>

	</body>

</html>
```



## Configuration

The configuration object accepts the following properties.

| Property               | Default     | Description                                                  |
| ---------------------- | ----------- | ------------------------------------------------------------ |
| `container`            | `null`      | *(required)* The DOM element where the map will be rendered. |
| `stores`               | `[]`        | *(required)* List of store objects (see chapter "Store").    |
| `searchHint`           | `''`        | Message to display below the search box.                     |
| `searchRadius`         | `30`        | The radius in Km or Miles (depending on the currently set unit system) within which to display stores when a new location is chosen. |
| `showStoreDistance`    | `true`      | Show the distance from each store to the chosen location.    |
| `orderByStoreDistance` | `true`      | Order stores by distance to the chosen location.             |
| `i18n`                 | `{}`        | Collection of strings for internationalization (see chapter "Internationalization"). |
| `mapAddress`           | `''`        | Set the address in the search box to use as the initial location. |
| `mapCenter`            | `{}`        | *(required)* Initial map center ([`LatLngLiteral`](https://developers.google.com/maps/documentation/javascript/reference/coordinates#LatLngLiteral), `{ lat: x, lng: y }`). |
| `mapFullWidth`         | `false`     | Make the map expand to the full width of the container on large screens, and show the store list as an overlay. |
| `mapLanguage`          | `''`        | Set the map language to a specific locale (i.e. 'en_US'). Default is the browser language. |
| `mapMarkerIcon`        | `{}`        | Custom icon for store markers. Accepts a [`google.maps.MarkerOptions`](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions) interface object. |
| `mapStreetViewControl` | `true`      | Show the Street View icon in the map.                        |
| `mapStyle`             | `[]`        | Map style (see [Google Map Style Wizard](https://mapstyle.withgoogle.com/) or [Snazzy Maps](https://snazzymaps.com/) for styling options). |
| `mapTerrainControl`    | `false`     | Show the terrain type switcher in the map.                   |
| `mapTravelMode`        | `'DRIVING'` | Mode used to calculate the time between points in the map (`'WALKING'` or `'DRIVING'`). |
| `mapUnitSystem`        | `'METRIC'`  | Mode used to calculate the distance between points in the map (`'METRIC'` {Km} or `'IMPERIAL'` {Mi}). |
| `mapZoom`              | `6`         | Initial map zoom.                                            |
| `onMapInit`            | `null`      | Hook which is called after the map initialization. The function is passed the `map` object. |
| `onPlaceChange`        | `null`      | Hook which is called after the search input has changed. The function is passed the `place` object. |



## Store

Each store object has the following properties:

| Property      | Type       | Description                                                  |
| ------------- | ---------- | ------------------------------------------------------------ |
| `name`        | `{String}` | *(required)* The name of the store.                          |
| `address`     | `{String}` | *(required)* The address of the store.                       |
| `location`    | `{Object}` | *(required)* The store coordinates ([`LatLngLiteral`](https://developers.google.com/maps/documentation/javascript/reference/coordinates#LatLngLiteral), `{ lat: x, lng: y }`). |
| `marker`      | `{Object}` | Custom icon for store markers. Accepts a [`google.maps.MarkerOptions`](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions) interface object. Overrides the global marker icon. |
| `thumbnail`   | `{String}` | The URL of a image representing the store. Displayed both in the stores listing and in the marker infowindow <sup>[1]</sup>. |
| `summary`     | `{String}` | Short description of the store. Displayed in the stores listing <sup>[1]</sup>. |
| `description` | `{String}` | Full description of the store. Displayed in the marker infowindow <sup>[1]</sup>. |
| `phone`       | `{String}` | The phone number of the store. Displayed in the marker infowindow <sup>[1]</sup>. |
| `email`       | `{String}` | The email address of the store. Displayed in the marker infowindow <sup>[1]</sup>. |
| `website`     | `{String}` | The website URL of the store. Displayed in the marker infowindow <sup>[1]</sup>. |

<sup>[1]</sup> The store info are outputted *both* in the listing item *and* in the infowindow. For optimal UX, some of these info are then hidden *with CSS* on the listing, and some other on the infowindow. If you want to change this, you can do so by simply overriding the styles.



## Internationalization (i18n)

The `i18n` object in the options has the following properties:

| Property          | Default                                                      |
| ----------------- | ------------------------------------------------------------ |
| `showPosition`    | `'Show your position'`                                       |
| `yourPosition`    | `'Your position'`                                            |
| `noResults`       | `'There are no results in the selected area'`                |
| `getDirections`   | `'Get directions'`                                           |
| `callPhoneNumber` | `'Call phone number'`                                        |
| `sendEmail`       | `'Send email'`                                               |
| `openWebsite`     | `'Open website'`                                             |
| `distanceText`    | `'{{distance}}'` (`{{distance}}` represents the computed distance, can be customized by adding text before or after, i.e. `{{distance}} away`) |
| `byCar`           | `'by car'`                                                   |
| `byWalk`          | `'by walk'`                                                  |



## Changelog

#### v2.3.2

- FIX: fixed issue with filters breaking search functionality when no filters are defined

#### v2.3.1

- FEATURE: added option to set map language to a specific locale

####v2.2.3

- CHANGE: Moved filters inside the main navigation and added a toggle for showing and hiding them

#### v2.2.2

- FIX: fixed issue for when filters are not applied when changing locations

#### v2.2.1

- FIX: fixed issue for when a filter is disabled and reenabled, it shows all the stores in the listing unregarding of location

#### v2.2.0

- FEATURE: added support for filters!

#### v2.1.0

- FEATURE: added option to order stores by distance to the searched location
– FIX: various style fixes

#### v2.0.0

- CHANGE: completely refactored to minimize the number of API requests (now the DistanceMatrix API is called only on stores within the radius of the searched location)
- CHANGE: changed some option names
- CHANGE: changed almost all js function names and css class names for better readability

#### v1.1.1

- CHANGE: added `summary` option for store
- FIX: fixed layout issue with thumbnail in the store list

#### v1.1.0

- FEATURE: added support for store thumbnails!
- FEATURE: added support for store email addresses (even encoded ones)!
- CHANGE: renamed class prefix to `store-locator` , and other class name changes
- CHANGE: used [Material Design Icons](https://github.com/google/material-design-icons) in SVG format for better color customization
- CHANGE: moved `searchHint` to global options (from `i18n.searchHint`)
- FIX: fixed active store scroll position when marker is clicked



## Roadmap

- Add support for identifying stores without using LatLng using the [Places API](https://developers.google.com/maps/documentation/javascript/places#TextSearchRequests).
- [DONE] Added support for getting current location on-demand

