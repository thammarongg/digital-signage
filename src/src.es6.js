function getQueryParams(url = window.location.href) {
  const query = {};
  const params = url.substr(url.lastIndexOf('?') + 1).split('&');
  _.each(params, (item) => {
    const col = item.split('=');
    query[decodeURIComponent(col[0])] = decodeURIComponent(col[1]);
  });
  return query;
}

function setFloorInfo(query) {
  const fvEle = document.getElementsByTagName('fv-map')[0];
  const titleEle = document.getElementById('title');
  fvEle.setAttribute('floor-id', parseInt(query.id, 10));
  titleEle.innerHTML = query.name;
}


const query = getQueryParams();
setFloorInfo(query);


// GLOBALS
_.assign(window, {
  gMap: null,
  M2: {
    position: {},
    roomID: '',
    zoomIn(e) {
      if (gMap) {
        gMap.zoomIn(e);
      }
    },
    zoomOut(e) {
      if (gMap) {
        gMap.zoomOut(e);
      }
    },
    reset() {
      if (gMap) {
        gMap.panTo(M2.position.center, {animate: false});
        gMap.setZoom(M2.position.zoom);
        if (M2.roomID) {
          gMap.selectRoom.byName('');
          gMap.options.selectMode = false;
          gMap._refreshLayers();
          M2.roomID = '';
          try {
            m2SetRTVar('roomId', '');
          } catch (er) {
            console.log('m2SetRTVar Error...');
          }
        }
      }
    },
    onRoomClick(e) {
      const room = e.room;
      const id = room.id;
      if (M2.roomID !== id) {
        M2.roomID = id;
        try {
          m2SetRTVar('roomId', '' + id);
        } catch (er) {
          console.log('m2SetRTVar Error...');
        }
        if (room.options.interactive) {
          gMap.selectRoom.byId(room.id);
          gMap.pingRoom(room, {
            screenRatio: 0.1,
            pulses: 4,
          });
        }
      }
    },
  },
  m2RunScript(str) {
    // 22 Miles
    const result = escape(str) + ' _unsetup=null;/**/';
    window.location = 'run://' + result;
  },
  zoomIn(e) {
    M2.zoomIn(e);
  },
  zoomOut(e) {
    M2.zoomOut(e);
  },
  reset() {
    M2.reset();
  },
  selectRoom(id) {
    if (gMap) {
      gMap.selectRoom.byId(id);
      gMap.pingRoom(gMap.roomById[id], {
        screenRatio: 0.1,
        pulses: 4,
      });
    }
  },
});


function addMarker(map, room, icon, popupLabel, delta = [0, 0]) {
  const b = room.getLargestRectangleBounds();
  const marker = L.marker(
    [b.getNorth() + delta[1], b.getCenter().lng + delta[0]],
    {icon: icon}
  );
  if (popupLabel) {
    marker.bindPopup(popupLabel);
  }
  return marker.addTo(map);
}

L.control({'position': 'topright'});
angular.module('DemoApp', ['i.floor-viewer'])
  .controller('DemoController', function DemoController($scope, fvUtil, fvDelegate) {
    fvUtil.config('https://demo.iofficeconnect.com', {
      'x-auth-username': query.user,
      'x-auth-password': query.pass,
    });
    setTimeout(() => {
      fvDelegate.getMap().then((map) => {
        gMap = map;
        map.zoomControl.setPosition('topright');
        // map.setZoom(map.getZoom() + 1);
        map.on('roomclick', M2.onRoomClick);
        document.getElementById('title').innerHTML = map.floor.building.name + ' / ' + map.floor.name;
        M2.position.zoom = map.getZoom();
        M2.position.center = map.getCenter();

        if (map.floor.id !== 224) {
          return;
        }

        map.onRoomsReady.then(() => {
          L.AwesomeMarkers.Icon.prototype.options.prefix = 'ion';
          const menRestRoomIcon = L.AwesomeMarkers.icon({
            icon: 'man',
            markerColor: 'gray',
          });
          const womenRestRoomIcon = L.AwesomeMarkers.icon({
            icon: 'woman',
            markerColor: 'gray',
          });
          const foodIcon = L.AwesomeMarkers.icon({
            icon: 'pizza',
            markerColor: 'blue',
          });
          const hereIcon = L.AwesomeMarkers.icon({
            icon: 'home',
            markerColor: 'red',
          });
          const labIcon = L.AwesomeMarkers.icon({
            icon: 'erlenmeyer-flask',
            markerColor: 'purple',
          });
          const exitIcon = L.AwesomeMarkers.icon({
            icon: 'android-exit',
            markerColor: 'red',
          });
          // 22miles
          try {
            const foodLayer = addMarker(map, map.roomByName['1834'], foodIcon, 'Cafeteria', [0, -0.3]);
            const hereLayer = addMarker(map, map.roomByName['1819'], hereIcon, 'You Are Here', [0.2, -0.85]);
            const restroomsLayers = new L.LayerGroup([
              addMarker(map, map.roomByName['1832'], womenRestRoomIcon, 'Women'),
              addMarker(map, map.roomByName['1833'], menRestRoomIcon, 'Men'),
            ]).addTo(map);
            const labLayer = addMarker(map, map.roomByName['1822'], labIcon, 'Laboratory', [0, -0.1]);
            const exitLayer = new L.LayerGroup([
              addMarker(map, map.roomByName['1826'], exitIcon, 'Emergency Exit', [0.1, -1.725]),
              addMarker(map, map.roomByName['1803'], exitIcon, 'Emergency Exit', [-0.025, 1.3]),
            ]).addTo(map);

            const baseLayers = {};
            const overLayers = {
              '<i class="icon ion-home"></i> You Are Here': hereLayer,
              '<i class="icon ion-woman"></i><i class="icon ion-man"></i> Restrooms': restroomsLayers,
              '<i class="icon ion-pizza"></i> Cafeteria': foodLayer,
              '<i class="icon ion-erlenmeyer-flask"></i> Laboratory': labLayer,
              '<i class="icon ion-android-exit"></i> Emergency Exit': exitLayer,
            };
            const panelLayers = L.control.layers(baseLayers, overLayers);
            map.addControl(panelLayers);
          } catch (er) {
            console.log('Error adding layers...');
          }
          const legend = L.control({position: 'bottomright'});
          legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'info legend');
            const data = {
              'Non-Reservable': 'lightgray',
              'Reservable': '#80C680',
              'Partially Available': '#FFB74D',
              'At Capacity': '#D32F2F',
            };
            _.each(data, (color, label) => {
              div.innerHTML +=
                '<i style="background:' + color + '"></i> ' +
                label + '<br>';
            });
            return div;
          };
          legend.addTo(map);
        });
      });
    }, 30);
  });