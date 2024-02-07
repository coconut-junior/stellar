Changelog:

Release 1.2.1
=============

Changed
* UI scaling is now similar to native apps. It can be adjusted by pressing CMD + or CMD -
* Minor visual changes to some UI elements
* CMD + R now restarts the app

Fixed
- If a new version of InDesign was installed and then uninstalled, it would leave behind some files causing the app to think the new version was still present. Stellar would install scripts to this directory, but would be unable to launch them. The current InDesign version is now detected using system_profiler.

Added
+ Automation search feature
+ The search tab, which was previously 'under construction' now links to the Lytho DAM


Release 1.0.7
=============

Changed
* Logos now download asyncronously, which means a performance boost

Fixed
- Window no longer freezes when a large download is in progress

Release 1.0.6
=============

Fixed
- Various bugs caused by Adobe CS6 (and older) script folders being present
- Window size forgotten upon closing and reopening the app

Added
+ Dark mode
+ Window behavior settings
+ Very epic animations