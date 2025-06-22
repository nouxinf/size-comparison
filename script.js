// Initialize maps
const drawMap = L.map('drawMap').setView([40.7128, -74.0060], 10); // New York
const compareMap = L.map('compareMap').setView([51.5074, -0.1278], 10); // London

// Add tile layers
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(drawMap);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(compareMap);

// Create proper FeatureGroups for polygons
const drawPolygons = new L.FeatureGroup();
drawMap.addLayer(drawPolygons);

const comparePolygons = new L.FeatureGroup();
compareMap.addLayer(comparePolygons);

// Drawing controls for the left map
const drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawPolygons,
        remove: true
    },
    draw: {
        polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: {
                color: '#ff6b6b',
                fillColor: '#ff6b6b',
                fillOpacity: 0.3,
                weight: 3
            }
        },
        polyline: {
            shapeOptions: {
                color: '#ff6b6b',
                weight: 4,
                opacity: 0.8
            }
        },
        circle: false,
        rectangle: false,
        marker: false,
        circlemarker: false
    }
});
drawMap.addControl(drawControl);

// Store the current polygon data
let currentPolygon = null;
let comparePolygonLayer = null;

// Function to create a draggable shape on the compare map
function createDraggableShape(layer) {
    let compareShapeLayer;

    if (layer instanceof L.Polygon) {
        // Handle polygons
        if (comparePolygonLayer) {
            comparePolygons.removeLayer(comparePolygonLayer);
        }

        const latlngs = layer.getLatLngs()[0];
        const bounds = L.latLngBounds(latlngs);
        const shapeCenter = bounds.getCenter();
        const mapCenter = compareMap.getCenter();
        const latOffset = mapCenter.lat - shapeCenter.lat;
        const lngOffset = mapCenter.lng - shapeCenter.lng;

        const adjustedLatLngs = latlngs.map(point =>
            L.latLng(point.lat + latOffset, point.lng + lngOffset)
        );

        compareShapeLayer = L.polygon(adjustedLatLngs, {
            color: '#6f60c0',
            fillColor: '#6a73da',
            fillOpacity: 0.3,
            weight: 3
        }).addTo(comparePolygons);

        comparePolygonLayer = compareShapeLayer;

    } else if (layer instanceof L.Polyline) {
        // Handle polylines (lines)
        if (comparePolygonLayer) {
            comparePolygons.removeLayer(comparePolygonLayer);
        }

        const latlngs = layer.getLatLngs();
        const bounds = L.latLngBounds(latlngs);
        const shapeCenter = bounds.getCenter();
        const mapCenter = compareMap.getCenter();
        const latOffset = mapCenter.lat - shapeCenter.lat;
        const lngOffset = mapCenter.lng - shapeCenter.lng;

        const adjustedLatLngs = latlngs.map(point =>
            L.latLng(point.lat + latOffset, point.lng + lngOffset)
        );

        compareShapeLayer = L.polyline(adjustedLatLngs, {
            color: '#6f60c0',
            weight: 4,
            opacity: 0.8
        }).addTo(comparePolygons);

        comparePolygonLayer = compareShapeLayer;
    }

    // Add drag functionality for both polygons and lines
    if (compareShapeLayer) {
        compareShapeLayer.on('mousedown', function (e) {
            const map = e.target._map;
            const shape = e.target;
            const startLatLng = e.latlng;
            let originalLatLngs;

            if (shape instanceof L.Polygon) {
                originalLatLngs = shape.getLatLngs()[0];
            } else {
                originalLatLngs = shape.getLatLngs();
            }

            map.dragging.disable();

            function onMouseMove(e) {
                const currentLatLng = e.latlng;
                const deltaLat = currentLatLng.lat - startLatLng.lat;
                const deltaLng = currentLatLng.lng - startLatLng.lng;

                const newLatLngs = originalLatLngs.map(point =>
                    L.latLng(point.lat + deltaLat, point.lng + deltaLng)
                );

                shape.setLatLngs(newLatLngs);
            }

            function onMouseUp() {
                map.off('mousemove', onMouseMove);
                map.off('mouseup', onMouseUp);
                map.dragging.enable();
            }

            map.on('mousemove', onMouseMove);
            map.on('mouseup', onMouseUp);
        });
    }
}

// Handle shape creation (both polygons and lines)
drawMap.on(L.Draw.Event.CREATED, function (e) {
    const layer = e.layer;
    drawPolygons.addLayer(layer);

    // Create the draggable version on the compare map
    createDraggableShape(layer);
});

// Handle shape editing
drawMap.on(L.Draw.Event.EDITED, function (e) {
    const layers = e.layers;
    layers.eachLayer(function (layer) {
        createDraggableShape(layer);
    });
});

// Handle shape deletion
drawMap.on(L.Draw.Event.DELETED, function (e) {
    if (comparePolygonLayer) {
        comparePolygons.removeLayer(comparePolygonLayer);
        comparePolygonLayer = null;
    }
});

// Utility functions
function clearPolygons() {
    drawPolygons.clearLayers();
    comparePolygons.clearLayers();
    comparePolygonLayer = null;
}

function centerMaps() {
    drawMap.setView([40.7128, -74.0060], 10);
    compareMap.setView([51.5074, -0.1278], 10);
}

// Add some visual feedback
drawMap.on('draw:drawstart', function () {
    document.querySelector('.info-panel').innerHTML =
        '<strong>Drawing...</strong> Click to add points, double-click to finish the shape.';
});

drawMap.on('draw:drawstop', function () {
    document.querySelector('.info-panel').innerHTML =
        '<strong>Instructions:</strong> Use the polygon or line tools to draw shapes. They will automatically appear on the comparison map.';
});