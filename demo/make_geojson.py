#!/usr/bin/env python

import csv
import geojson
from geojson import FeatureCollection, Feature, Point

inf = csv.reader(open('rail_stops.csv', 'rb'))
my_feats = [] # list of features
for ln in inf:
    print(ln)
    props = { 'stop': ln[1], 'full name': ln[2] }

    # Point((lon, lat))
    pt = Point((float(ln[4]), float(ln[3])))
    feat = Feature(geometry=pt, id=ln[0], properties=props)
    my_feats.append(feat)

coll = FeatureCollection(my_feats)
outf = open('railgeo.json', 'wb')
outf.write(geojson.dumps(coll, sort_keys=True))
outf.close()
