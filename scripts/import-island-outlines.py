"""Refresh the attributed OneMap island outline snapshot (Python standard library)."""
import datetime
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

SOURCE = 'https://services7.arcgis.com/yvCbn3q8PPtPLZIM/arcgis/rest/services/island_20240509/FeatureServer/0'
DESTINATION = Path(__file__).resolve().parents[1] / 'frontend/public/data/maldives-islands.geojson'


def query(**params):
    with urlopen(SOURCE + '/query?' + urlencode(params), timeout=60) as response:
        data = json.load(response)
    if 'error' in data:
        raise RuntimeError(data['error'])
    return data


def check_coordinates(coordinates):
    if isinstance(coordinates[0], (int, float)):
        lon, lat = coordinates[:2]
        if not (72 < lon < 74.5 and -1 < lat < 8):
            raise ValueError(f'Unexpected Maldives coordinate: {coordinates}')
        return
    for child in coordinates:
        check_coordinates(child)


def main():
    count = query(where='1=1', returnCountOnly='true', f='json')['count']
    features = []
    seen = set()
    for offset in range(0, count, 500):
        page = query(where='1=1', outFields='OBJECTID,FCODE,islandName,category',
                     orderByFields='OBJECTID', returnGeometry='true', outSR=4326,
                     geometryPrecision=5, maxAllowableOffset=0.00002,
                     resultOffset=offset, resultRecordCount=500, f='geojson')
        for feature in page['features']:
            props = feature['properties']
            identifier = props['OBJECTID']
            if identifier in seen:
                raise ValueError('Repeated record in pagination')
            seen.add(identifier)
            geometry = feature['geometry']
            if not geometry or geometry['type'] not in ('Polygon', 'MultiPolygon'):
                raise ValueError(f'Missing polygon for {identifier}')
            check_coordinates(geometry['coordinates'])
            features.append({'type': 'Feature', 'properties': {
                'id': (props.get('FCODE') or str(identifier)).lower(),
                'name': props.get('islandName'), 'category': props.get('category'),
            }, 'geometry': geometry})
    if len(features) != count:
        raise ValueError(f'Incomplete download: {len(features)} / {count}')
    collection = {'type': 'FeatureCollection', 'source': SOURCE,
                  'retrieved_at': datetime.datetime.now(datetime.timezone.utc).date().isoformat(),
                  'attribution': 'Geomatics Department, Ministry of Infrastructure, Housing and Urban Development, Maldives (OneMap)',
                  'license': 'https://readme.onemap.mv/pdf/Data%20Usage%20License.pdf',
                  'features': features}
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    pending = DESTINATION.with_suffix('.tmp')
    pending.write_text(json.dumps(collection, separators=(',', ':'), ensure_ascii=False) + '\n')
    pending.replace(DESTINATION)
    print(f'Saved {count} validated island outlines ({DESTINATION.stat().st_size:,} bytes)')


if __name__ == '__main__':
    main()
