# Night Sky data and calculations

## OpenNGC catalog subset

`src/data/deep-sky-targets.ts` is an adapted subset of OpenNGC, by Mattia Verga
and contributors: https://github.com/mattiaverga/OpenNGC.
Source commit: be3cd6c5498806a2fbb2f7e0452ef802dbb02be0.

The data subset is licensed CC BY-SA 4.0 (see
`LICENSES/OpenNGC-CC-BY-SA-4.0.txt`). Changes: selected 26 objects, converted
sexagesimal J2000 coordinates to numeric hours/degrees, retained major-axis
angular sizes, and supplied display names/categories. The data remain under
CC BY-SA 4.0; Beacon's application code retains its existing license.
The source README credits the NED, HyperLEDA, SIMBAD, HEASARC and Harold Corwin
catalogs used to compile OpenNGC. Refer to OpenNGC's Sources column for provenance.

## Astronomy Engine

Astronomy Engine 2.1.19 by Don Cross is MIT licensed. See
`LICENSES/Astronomy-Engine-MIT.txt` and https://github.com/cosinekitty/astronomy.
It supplies local Sun, Moon and planet ephemerides and coordinate transforms.
