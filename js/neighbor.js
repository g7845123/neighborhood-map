var ViewModel = function() {

  var self = this;
  var map = new google.maps.Map(document.getElementById('map-canvas'));
  // Marker for center place. Different from markers of other neighbor places
  var centerMarker = new google.maps.Marker();
  // Current infowindow, will be activated if marker or list item is clicked
  var infowindow = new google.maps.InfoWindow();
  
  // Track user input text in search bar
  self.centerText = ko.observable();
  // Array of neighbor places. Each item is generated using "NeighborPlace" constructor
  self.neighborPlaces = ko.observableArray([]);
  // Three possible status: 
  //   "Loading...": The neighbor places are not returned
  //   "No Results Found": Empty set of neighbor places is returned
  //   "Error": Something wrong happened when loading third-party APIs
  self.status = ko.observable()

  // Set new center if center text in search bar is changed
  self.centerText.subscribe(function(newCenterText) {
    setCenterPlace(newCenterText);
  });

  // Set Udacity as the default address
  var defaultAddress = "Udacity";
  self.centerText(defaultAddress);
  map.setOptions({
    zoom: 14,
    disableDefaultUI: true
  });

  /**
   * Represent a neighbor place.
   * @constructor
   * @param {object} venue - Venue object is part of the returned Foursquare response
   */
  var NeighborPlace = function(venue) {
    this.name = venue.name;
    this.category = venue.categories[0].name;
    this.address = venue.location.address;
    this.phone = venue.contact.formattedPhone;
    // If there is no rating in venue object, set rating to false and no rating will be displayed
    if (!venue.rating) {
      this.rating = false;
    } else {
      this.rating = venue.rating;
    }
    this.latLng = new google.maps.LatLng(venue.location.lat, venue.location.lng);
    this.marker = new google.maps.Marker({
      position: this.latLng,
      map: map,
      title: this.name,
    });
    // Open infowindow and center the clicked place
    google.maps.event.addListener(this.marker, 'click', (function(neighborPlace) {
      return function() {
        self.showInfowindow(neighborPlace);
      }
    })(this));
  }

  /**
   * Will show infowindow and center the clicked place
   * @param {object} neighborPlace - Defined by "NeighborPlace" constructor
   */
  self.showInfowindow = function(neighborPlace) {
    // Center map to clicked place
    map.panTo(neighborPlace.latLng);
    // Content of infowindow
    var contentString = '<div class="infowindow">' + '<div class="neighbor-name">' + neighborPlace.name + '</div><div>' + neighborPlace.address + '</div></div>';
    infowindow.setContent(contentString);
    // Open infowindow
    infowindow.open(map, neighborPlace.marker);
  }

  /**
   * Search user input and set it as the new center
   * @param {string} centerText - User input text in search bar
   */
  function setCenterPlace(centerText) {
    // Unbind all markers and clear neighborPlaces array
    clearNeighborPlaces();
    self.status("Loading...");
    // Use Google Places Library for text search
    var request = {
      query: centerText
    };
    service = new google.maps.places.PlacesService(map);
    service.textSearch(request, function(results, status) {
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        // Get returned place and center map to it
        var centerPlace = results[0];
        map.panTo(centerPlace.geometry.location);
        // Set costomized marker to center place
        centerMarker.setOptions({
          position: centerPlace.geometry.location,
          map: map,
          title: centerText,
          // Marker of center place is represented by a red star, which is different from markers of neighbor places
          icon: "img/center-marker.png"
        });
        // When marker is clicked center map to that marker and open infowindow
        google.maps.event.addListener(centerMarker, 'click', function() {
          infowindow.setContent(centerText);
          map.panTo(centerPlace.geometry.location);
          infowindow.open(map, centerMarker);
        });
        // After center place is set, search neighbor places
        searchNearby(centerPlace);
      } else {
        // Service failed, set status to "Error"
        self.status("Error");
        console.log("Error Loading Google Places Service")
      }
    });
  }

  /**
   * Search neighbor places around a given center place, using Foursquare API
   * @param {object} centerPlace - Google text search result object. centerPlace.geometry.location is used 
   */
  function searchNearby(centerPlace) {
    var foursquareUrl = 'https://api.foursquare.com/v2/venues/explore?client_id=FF0BCPAJW3BEGI5I1DDYFI0XHJMTE0JJEMMQYPUNQ1HTRJGY&client_secret=ZOPIJJHCTB2DMRXORVYKAGKCGPK3JNSX4PK4G2YIKSJFFLG4&v=20130815&ll='+centerPlace.geometry.location.lat()+','+centerPlace.geometry.location.lng();
    $.getJSON(foursquareUrl, function(data) {
        // Array of neighbor places returned by Foursquare
        var neighborPlaces = data.response.groups[0].items;
        for (var i=0; i<neighborPlaces.length; i++) {
          var venue = neighborPlaces[i].venue;
          // Create neighbor place using "NeighborPlace" constructor, push it into neighborPlaces array
          self.neighborPlaces.push(new NeighborPlace(venue));
        }
        if (self.neighborPlaces().length === 0) {
          // Request succeed, but on result is found
          self.status("No Results Found");
        }
    }).error(function (errorMessage) {
        // Request failed, set status to "Error"
        self.status("Error");
        console.log("Error Loading Foursquare Search Service")
    });
  }

  /** Unbind all markers and empty neighborPlaces array */
  function clearNeighborPlaces() {
    // Unbind marker of center place
    centerMarker.setMap(null);
    // Unbind markers of neighbor places
    self.neighborPlaces().forEach(function(neighborPlace) {
      neighborPlace.marker.setMap(null);
    });
    // Clear neighbor places
    self.neighborPlaces([]);
  }
};

// Bind viewModel after the DOM is loaded
google.maps.event.addDomListener(window, 'load', function() {
  ko.applyBindings(new ViewModel());
})
