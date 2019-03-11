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

| Property                | Default     | Description                                                  |
| ----------------------- | ----------- | ------------------------------------------------------------ |
| `container`             | `null`      | *(required)* The DOM element where the map will be rendered. |
| `stores`                | `[]`        | *(required)* List of store objects (see chapter "Store").    |
| `searchHint`            | `''`        | Message to display below the search box.                     |
| `fullwidth`             | `false`     | Make the map expand to the full width of the container on large screens, and show the store list as an overlay. |
| `center`                | `{}`        | Initial map center ([`LatLngLiteral`](https://developers.google.com/maps/documentation/javascript/reference/coordinates#LatLngLiteral), `{ lat: x, lng: y }`). Not required, but recommended (as default is Italy :–D). |
| `address`               | `''`        | Set the address in the search box to use as the initial location. Overrides the `center` prop. |
| `findUserLocation`      | `true`      | Determine the current location of the user on map initialization (if user allows geolocation in her browser). Overrides the `address` prop. |
| `marker`                | `{}`        | Custom icon for store markers. Accepts a [`google.maps.MarkerOptions`](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions) interface object. |
| `style`                 | `[]`        | Map style (see [Google Map Style Wizard](https://mapstyle.withgoogle.com/) or [Snazzy Maps](https://snazzymaps.com/) for styling options). |
| `unitSystem`            | `'METRIC'`  | Mode used to calculate the distance between points in the map (`'METRIC'` {Km} or `'IMPERIAL'` {Mi}). |
| `travelMode`            | `'DRIVING'` | Mode used to calculate the time between points in the map (`'WALKING'` or `'DRIVING'`). |
| `zoom`                  | `6`         | Initial map zoom.                                            |
| `zoomSelection`         | `17`        | Map zoom when a store is selected.                           |
| `showStoreDistance`     | `true`      | Show the distance to each store from the chosen location.    |
| `nearestStores`         | `1`         | After searching for a location, resize the map to show the closest `N` results from the location. With the value of `1`, it shows the nearest store. To skip resizing altoghether, set the value to `0`. |
| `fartherStoresOpacity`  | `1.00`      | Opacity value for the markers of the farthest stores (the ones not included in the value above). This can be lowered to "mute" or hide the stores that are far from the current location. |
| `showStreetViewControl` | `true`      | Show the Street View icon in the map.                        |
| `showTerrainControl`    | `false`     | Show the terrain type switcher in the map.                   |
| `i18n`                  | `{}`        | Collection of strings for internationalization (see chapter "Internationalization"). |



## Store

Each store object has the following properties:

| Property      | Type       | Description                                                  |
| ------------- | ---------- | ------------------------------------------------------------ |
| `name`        | `{String}` | *(required)* The name of the store.                          |
| `address`     | `{String}` | *(required)* The address of the store.                       |
| `location`    | `{Object}` | *(required)* The store coordinates ([`LatLngLiteral`](https://developers.google.com/maps/documentation/javascript/reference/coordinates#LatLngLiteral), `{ lat: x, lng: y }`). |
| `summary`     | `{String}` | Short description if the store, displayed in the stores list. |
| `description` | `{String}` | Full description of the store, displayed in the map when marker is clicked. |
| `thumbnail`   | `{String}` | The URL of a image representing the store.                   |
| `marker`      | `{Object}` | Custom icon for store markers. Accepts a [`google.maps.MarkerOptions`](https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerOptions) interface object. Overrides the global marker icon. |
| `phone`       | `{String}` | The phone number of the store.                               |
| `email`       | `{String}` | The email address of the store.                              |
| `website`     | `{String}` | The website URL of the store.                                |



## Internationalization (i18n)

The `i18n` object in the options has the following properties:

| Property          | Default                                                      |
| ----------------- | ------------------------------------------------------------ |
| `currentLocation` | `'Current Location'`                                         |
| `directions`      | `'Directions'`                                               |
| `phone`           | `'Call'`                                                     |
| `email`           | `'Message'`                                                  |
| `website`         | `'Website'`                                                  |
| `distance`        | `'{{distance}}'` (`{{distance}}` represents the computed distance, can be customized by adding text before or after, i.e. `{{distance}} away`) |
| `byCar`           | `'by car'`                                                   |
| `byWalk`          | `'by walk'`                                                  |



## Changelog

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

- Add support for getting current location on-demand
- Add support for identifying stores without using LatLng using the [Places API](https://developers.google.com/maps/documentation/javascript/places#TextSearchRequests).