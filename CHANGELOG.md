
<small>Note: If you find missing information about particular minor version, that version must have been changed without any functional change in this library.</small>

**1.0.0-beta.2 / 2025-03-06**
- Replace CSV layout with PatternLayout
- Support `flush` to clean all active scenarios
- remove fatal level
- fix subflows
- fix edge case scenarios
- fix trace level logs

**1.0.0-beta.1 / 2025-03-05**
- Fix CSV layout to handle special chars and change steps pattern

**1.0.0-beta.0 / 2025-03-04**
- Beta release of Flowgger with following functionalities
  - Basic appenders
    - Basic File Appender
    - Console Appender
    - System Out Appender
    - System Err Appender
  - Dynamic logging using play/pause: support keys, flow names, and log types
  - Custom Layout
  - Custom Appenders
  - Log4jsAppender
  - Filters
    - notFor
    - onlyFor
