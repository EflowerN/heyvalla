"""Convert official OneMap Reefs.rar/Lagoons.rar shapefiles for the basemap.

Extract the published archives first, then run with --reef and --lagoon .shp paths.
Conversion-only dependencies: pyshp, pyproj, shapely (see docs/development.md).
"""
import argparse
import datetime
import hashlib
import json
from pathlib import Path

import shapefile
from pyproj import CRS, Transformer
from shapely.geometry import MultiPolygon, shape, mapping
from shapely.ops import transform
from shapely.validation import make_valid

DESTINATION = Path(__file__).resolve().parents[1] / 'frontend/public/data/maldives-reefs-lagoons.geojson'
BASE_URL = 'https://readme.onemap.mv/Datashare/'


def polygon_parts(geometry):
    if geometry.geom_type == 'Polygon':
        return [geometry]
    if hasattr(geometry, 'geoms'):
        return [part for child in geometry.geoms for part in polygon_parts(child)]
    return []


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reef', type=Path, required=True)
    parser.add_argument('--lagoon', type=Path, required=True)
    args = parser.parse_args()
    features, sources = [], []
    # Lagoons render below reefs within the shared geographic layer.
    for kind, path, archive in [('lagoon', args.lagoon, 'Lagoons.rar'), ('reef', args.reef, 'Reefs.rar')]:
        source_crs = CRS.from_wkt(path.with_suffix('.prj').read_text())
        if not source_crs.is_projected or source_crs.axis_info[0].unit_name != 'metre':
            raise ValueError('Simplification requires projected metre coordinates')
        projector = Transformer.from_crs(source_crs, 'EPSG:4326', always_xy=True)
        reader = shapefile.Reader(str(path))
        count, repaired = 0, 0
        for index, record in enumerate(reader.iterShapeRecords()):
            geometry = shape(record.shape.__geo_interface__)
            if not geometry.is_valid:
                geometry = make_valid(geometry)
                repaired += 1
            parts = polygon_parts(geometry)
            if not parts:
                raise ValueError(f'No polygon in {kind} record {index}')
            geometry = parts[0] if len(parts) == 1 else MultiPolygon(parts)
            # Ten-metre simplification preserves topology and source polygon holes.
            geometry = geometry.simplify(10, preserve_topology=True)
            geographic = transform(projector.transform, geometry)
            if geographic.is_empty or not geographic.is_valid:
                raise ValueError(f'Invalid converted {kind} record {index}')
            west, south, east, north = geographic.bounds
            if not (72 < west <= east < 74.5 and -1 < south <= north < 8):
                raise ValueError(f'Out-of-bounds {kind} record {index}')
            props = record.record.as_dict()
            features.append({'type': 'Feature', 'properties': {
                'id': f'{kind}-{index}', 'source_code': props.get('FCODE'),
                'kind': kind, 'name': props.get('name'), 'atoll': props.get('Atoll'),
            }, 'geometry': mapping(geographic)})
            count += 1
        if count != len(reader):
            raise ValueError('Incomplete shape conversion')
        sources.append({'kind': kind, 'url': BASE_URL + archive, 'features': count,
                        'source_crs': source_crs.to_string(), 'repaired_geometries': repaired,
                        'sha256_shp': hashlib.sha256(path.read_bytes()).hexdigest()})
        print(f'{kind}: {count} features; {repaired} repaired geometries')
    snapshot = {'type': 'FeatureCollection', 'sources': sources,
                'retrieved_at': datetime.datetime.now(datetime.timezone.utc).date().isoformat(),
                'attribution': 'Geomatics Department, Ministry of Infrastructure, Housing and Urban Development, Maldives (OneMap)',
                'license': 'https://readme.onemap.mv/pdf/Data%20Usage%20License.pdf',
                'simplification_metres': 10, 'features': features}
    pending = DESTINATION.with_suffix('.tmp')
    pending.write_text(json.dumps(snapshot, separators=(',', ':'), ensure_ascii=False) + '\n')
    pending.replace(DESTINATION)
    print(f'Saved {len(features)} features ({DESTINATION.stat().st_size:,} bytes)')


if __name__ == '__main__':
    main()
