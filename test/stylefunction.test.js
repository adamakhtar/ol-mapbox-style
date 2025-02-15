import Feature from 'ol/Feature.js';
import Polygon from 'ol/geom/Polygon.js';
import VectorLayer from 'ol/layer/Vector.js';
import applyStyleFunction, {
  recordStyleLayer,
  renderTransparent,
} from '../src/stylefunction.js';
import deepFreeze from 'deep-freeze';
import olms from '../src/index.js';
import should from 'should';
import states from './fixtures/states.json';

describe('stylefunction', function () {
  describe('OpenLayers Style object creation', function () {
    let feature, layer;
    beforeEach(function () {
      feature = new Feature(
        new Polygon([
          [
            [-1, -1],
            [-1, 1],
            [1, 1],
            [1, -1],
            [-1, -1],
          ],
        ])
      );
      layer = new VectorLayer();
    });

    afterEach(function () {
      recordStyleLayer(false);
      renderTransparent(false);
    });

    it('does not modify the input style object', function () {
      const style = JSON.parse(JSON.stringify(states));
      deepFreeze(style);
      should.doesNotThrow(function () {
        applyStyleFunction(layer, style, 'states');
      });
    });

    it('creates a style function with all layers of a source', function () {
      const style = applyStyleFunction(layer, states, 'states');
      should(style).be.a.Function();
      feature.set('PERSONS', 2000000);
      should(style(feature, 1)).be.an.Array();
      feature.set('PERSONS', 4000000);
      should(style(feature, 1)).be.an.Array();
      feature.set('PERSONS', 6000000);
      should(style(feature, 1)).be.an.Array();
    });

    it('creates a style function with some layers of a source', function () {
      const style = applyStyleFunction(layer, states, ['population_lt_2m']);
      should(style).be.a.Function;
      feature.set('PERSONS', 2000000);
      should(style(feature, 1)).be.an.Array();
      feature.set('PERSONS', 4000000);
      should(style(feature, 1)).be.undefined();
      feature.set('PERSONS', 6000000);
      should(style(feature, 1)).be.undefined();
    });

    it('should handle has and !has', function () {
      const style = applyStyleFunction(layer, states, ['has_male']);
      should(style).be.a.Function;
      should(style(feature, 1)).be.undefined();
      feature.set('MALE', 20000);
      should(style(feature, 1)).be.an.Array();
      const style2 = applyStyleFunction(layer, states, ['not_has_male']);
      should(style2(feature, 1)).be.undefined();
      feature.unset('MALE');
      should(style2(feature, 1)).be.an.Array();
    });

    it('should handle layer visibility', function () {
      const style = applyStyleFunction(layer, states, ['state_names']);
      should(style(feature, 1)).be.undefined();
    });

    it('records the style layer the feature belongs to', function () {
      const style = applyStyleFunction(layer, states, [
        'population_lt_2m',
        'population_gt_4m',
      ]);
      recordStyleLayer(true);
      feature.set('PERSONS', 5000000);
      style(feature, 1);
      should(feature.get('mapbox-layer').id).equal('population_gt_4m');
      feature.set('PERSONS', 1000000);
      style(feature, 1);
      should(feature.get('mapbox-layer').id).equal('population_lt_2m');
    });

    it('does not render transparent content by default', function () {
      const styleObject = JSON.parse(JSON.stringify(states));
      styleObject.layers.push({
        'id': 'transparent',
        'type': 'fill',
        'source': 'states',
        'paint': {
          'fill-color': 'rgba(0,0,0,0)',
        },
      });
      const styleFn = applyStyleFunction(layer, styleObject, ['transparent']);
      const style = styleFn(feature, 1);
      should(style).be.undefined;
    });

    it('renders transparent content when `renderTransparent(true)` is set', function () {
      const styleObject = JSON.parse(JSON.stringify(states));
      styleObject.layers.push({
        'id': 'transparent',
        'type': 'fill',
        'source': 'states',
        'paint': {
          'fill-color': 'rgba(0,0,0,0)',
        },
      });
      renderTransparent(true);
      const styleFn = applyStyleFunction(layer, styleObject, ['transparent']);
      const style = styleFn(feature, 1);
      should(style).be.an.Array();
      should(style[0].getFill().getColor()).eql('transparent');
    });

    it('renders the correct fill color with opacity', function () {
      const styleObject = JSON.parse(JSON.stringify(states));
      styleObject.layers.push({
        'id': 'transparent',
        'type': 'fill',
        'source': 'states',
        'paint': {
          'fill-color': 'rgba(16,234,42,0.5)',
        },
      });
      renderTransparent(true);
      const styleFn = applyStyleFunction(layer, styleObject, ['transparent']);
      const style = styleFn(feature, 1);
      should(style).be.an.Array();
      should(style[0].getFill().getColor()).eql('rgba(16,234,42,0.5)');
    });

    it('renders the outline when fill has zero opacity', function () {
      const styleObject = JSON.parse(JSON.stringify(states));
      styleObject.layers.push({
        'id': 'transparent',
        'type': 'fill',
        'source': 'states',
        'paint': {
          'fill-color': 'rgba(16,234,42,0)',
          'fill-outline-color': 'red',
        },
      });
      renderTransparent(false);
      const styleFn = applyStyleFunction(layer, styleObject, ['transparent']);
      const style = styleFn(feature, 1);
      should(style).be.an.Array();
      should(style[0].getFill()).eql(null);
      should(style[0].getStroke().getColor()).eql('rgba(255,0,0,1)');
    });
  });

  describe('Points with labels', function () {
    let style;
    beforeEach(function () {
      style = {
        version: '8',
        name: 'test',
        sources: {
          'geojson': {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [0, 0],
                  },
                  properties: {
                    'name': 'test',
                  },
                },
              ],
            },
          },
        },
        layers: [
          {
            id: 'test',
            type: 'symbol',
            source: 'geojson',
            layout: {
              'symbol-placement': 'point',
              'icon-image': 'donut',
              'text-anchor': 'bottom',
              'text-line-height': 1.2,
              'text-field': '{name}\n',
              'text-font': ['sans-serif'],
              'text-size': 12,
              'text-justify': 'center',
            },
            paint: {
              'text-halo-width': 2,
            },
          },
        ],
      };
    });

    it('calculates correct offsetY', function (done) {
      olms(document.createElement('div'), style)
        .then(function (map) {
          const layer = map.getLayers().item(0);
          const styleFunction = layer.getStyle();
          const feature = layer.getSource().getFeatures()[0];
          const styles = styleFunction(feature, 1);
          const text = styles[0].getText();
          const textHaloWidth = style.layers[0].paint['text-halo-width'];
          const textLineHeight = style.layers[0].layout['text-line-height'];
          const textSize = style.layers[0].layout['text-size'];
          // offsetY is the halo width plus half the distance between two lines
          should(text.getOffsetY()).eql(
            -textHaloWidth - 0.5 * (textLineHeight - 1) * textSize
          );
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });

    it('trims the label-field', function (done) {
      olms(document.createElement('div'), style)
        .then(function (map) {
          const layer = map.getLayers().item(0);
          const styleFunction = layer.getStyle();
          const feature = layer.getSource().getFeatures()[0];
          const styles = styleFunction(feature, 1);
          const text = styles[0].getText();
          should(text.getText()).eql('test');
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });
  });

  describe('Icon color with zero opacity', function () {
    let style;
    beforeEach(function () {
      style = {
        version: '8',
        name: 'test',
        sprite: '/fixtures/sprites',
        sources: {
          'geojson': {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [0, 0],
                  },
                  properties: {
                    'name': 'test',
                  },
                },
              ],
            },
          },
        },
        layers: [
          {
            id: 'test',
            type: 'symbol',
            source: 'geojson',
            layout: {
              'symbol-placement': 'point',
              'icon-image': 'amenity_firestation',
              'text-anchor': 'bottom',
              'text-line-height': 1.2,
              'text-field': '{name}\n',
              'text-font': ['sans-serif'],
              'text-size': 12,
              'text-justify': 'center',
            },
            paint: {
              'text-halo-width': 2,
              'icon-color': 'rgba(255,255,255,0)',
            },
          },
        ],
      };
    });

    it('does not create an image style when iconColor opacity is 0', function (done) {
      olms(document.createElement('div'), style)
        .then(function (map) {
          const layer = map.getLayers().item(0);
          layer.once('change', () => {
            const styleFunction = layer.getStyle();
            const feature = layer.getSource().getFeatures()[0];
            const styles = styleFunction(feature, 1);
            const text = styles[0].getText();
            should(text.getText()).eql('test');
            const image = styles[0].getImage();
            should(image).eql(undefined);
            done();
          });
        })
        .catch(function (err) {
          done(err);
        });
    });
  });

  describe('Max angle', function () {
    let style;
    beforeEach(function () {
      style = {
        version: '8',
        name: 'test',
        sources: {
          'geojson': {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: [
                      [0, 0],
                      [1, 1],
                    ],
                  },
                  properties: {
                    'name': 'test',
                  },
                },
              ],
            },
          },
        },
        layers: [
          {
            id: 'test',
            type: 'symbol',
            source: 'geojson',
            layout: {
              'symbol-placement': 'line',
              'text-field': '{name}',
            },
          },
        ],
      };
    });

    it('should set max angle when exists', function (done) {
      style.layers[0].layout['text-max-angle'] = 0;
      olms(document.createElement('div'), style)
        .then(function (map) {
          const layer = map.getLayers().item(0);
          const styleFunction = layer.getStyle();
          const feature = layer.getSource().getFeatures()[0];
          const styles = styleFunction(feature, 1);
          const text = styles[0].getText();
          should(text.getMaxAngle()).eql(0);
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });

    it('should not set max angle when it doesnt exist', function (done) {
      olms(document.createElement('div'), style)
        .then(function (map) {
          const layer = map.getLayers().item(0);
          const styleFunction = layer.getStyle();
          const feature = layer.getSource().getFeatures()[0];
          const styles = styleFunction(feature, 1);
          const text = styles[0].getText();
          should(text.getMaxAngle()).eql(Math.PI / 4);
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });
  });

  describe('Multiple related styles', function () {
    let style;
    beforeEach(function () {
      style = {
        version: '8',
        name: 'test',
        sources: {
          'geojson': {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'Polygon',
                    coordinates: [
                      [
                        [-1, -1],
                        [-1, 1],
                        [1, 1],
                        [1, -1],
                        [-1, -1],
                      ],
                    ],
                  },
                },
              ],
            },
          },
        },
        layers: [
          {
            id: 'test',
            type: 'fill',
            source: 'geojson',
            paint: {
              'fill-color': '#A6CEE3',
            },
          },
        ],
      };
    });

    it('returns distinct values for same layer id', function (done) {
      const style1 = JSON.parse(JSON.stringify(style));
      const style2 = JSON.parse(JSON.stringify(style));
      style2.layers[0].paint['fill-color'] = '#B2DF8A';

      Promise.all([
        olms(document.createElement('div'), style1),
        olms(document.createElement('div'), style2),
      ])
        .then(function (maps) {
          const layer1 = maps[0].getLayers().item(0);
          const layer2 = maps[1].getLayers().item(0);
          const styleFunction1 = layer1.getStyle();
          const feature1 = layer1.getSource().getFeatures()[0];
          const styles1 = styleFunction1(feature1, 1);
          const fill1 = styles1[0].getFill();
          should(fill1.getColor()).eql('rgba(166,206,227,1)');
          const styleFunction2 = layer2.getStyle();
          const feature2 = layer2.getSource().getFeatures()[0];
          const styles2 = styleFunction2(feature2, 1);
          const fill2 = styles2[0].getFill();
          should(fill2.getColor()).eql('rgba(178,223,138,1)');
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });
  });
});
