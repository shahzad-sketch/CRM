/**
 * Schema.gs – AUTO-GENERATED from the database design. One entry per sheet.
 * stage = which stage file it lives in · module = permission module · entity = SYS_SEQUENCE entity
 * cols: n=name t=type r=required ref=key/reference by=USER|SYSTEM|SYNC d=description
 */
const STAGE_FILES = {
  "00": "IMS_00_SYSTEM",
  "01": "IMS_01_MASTERS",
  "02": "IMS_02_PROJECT",
  "03": "IMS_03_BOM",
  "04": "IMS_04_ALLOCATION",
  "05": "IMS_05_PROCUREMENT",
  "06": "IMS_06_RECEIPT",
  "07": "IMS_07_INVENTORY",
  "08": "IMS_08_SITE",
  "09": "IMS_09_CLOSURE_REPORTS"
};

const SCHEMA = {
 "SYS_CONFIG": {
  "stage": "00",
  "module": "SETTINGS",
  "entity": "",
  "pk": "CONFIG_KEY",
  "cols": [
   {
    "n": "CONFIG_KEY",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "USER",
    "d": "Unique setting key (UPPER_SNAKE)"
   },
   {
    "n": "CONFIG_VALUE",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "Setting value (text; parse in script)"
   },
   {
    "n": "DESCRIPTION",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": "What the setting controls"
   },
   {
    "n": "STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "ACTIVE / INACTIVE",
    "by": "USER",
    "d": "Only ACTIVE keys are loaded"
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "SYS_SEQUENCE": {
  "stage": "00",
  "module": "SETTINGS",
  "entity": "",
  "pk": "ENTITY",
  "cols": [
   {
    "n": "ENTITY",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "USER",
    "d": "Sheet / entity the ID belongs to"
   },
   {
    "n": "PREFIX",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "ID prefix"
   },
   {
    "n": "USE_FY",
    "t": "Y/N",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "Y = PREFIX-FY-#### ; N = PREFIX-#####"
   },
   {
    "n": "PAD_LENGTH",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "Zero padding of the running number"
   },
   {
    "n": "LAST_NUMBER",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last number issued"
   },
   {
    "n": "LAST_FY",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "FY of LAST_NUMBER; when CURRENT_FY changes, counter resets"
   }
  ]
 },
 "SYS_LOOKUP": {
  "stage": "00",
  "module": "SETTINGS",
  "entity": "",
  "pk": "",
  "cols": [
   {
    "n": "LIST_NAME",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "Name of the dropdown list"
   },
   {
    "n": "VALUE",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "Option value stored in data sheets"
   },
   {
    "n": "SORT_ORDER",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": "Display order"
   },
   {
    "n": "STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "ACTIVE / INACTIVE",
    "by": "USER",
    "d": "Hide INACTIVE options in forms"
   }
  ]
 },
 "SYS_APPROVAL_MATRIX": {
  "stage": "00",
  "module": "SETTINGS",
  "entity": "RULE",
  "pk": "RULE_ID",
  "cols": [
   {
    "n": "RULE_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "USER",
    "d": ""
   },
   {
    "n": "DOC_TYPE",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "BOM / PR / PO / SITE_MR / ADJUSTMENT / WASTAGE / TRANSFER / CLOSURE"
   },
   {
    "n": "MIN_VALUE",
    "t": "CURRENCY",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "Lower bound of document value (inclusive)"
   },
   {
    "n": "MAX_VALUE",
    "t": "CURRENCY",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "Upper bound (use 999999999 for no limit)"
   },
   {
    "n": "APPROVAL_LEVEL",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "1 = first approver, 2 = second ..."
   },
   {
    "n": "APPROVER_ROLE",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(ROLE)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "ACTIVE / INACTIVE",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "SYS_AUDIT_LOG": {
  "stage": "00",
  "module": "SETTINGS",
  "entity": "LOG",
  "pk": "LOG_ID",
  "cols": [
   {
    "n": "LOG_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "LOG_TIME",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "USER_EMAIL",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ACTION",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "CREATE / UPDATE / APPROVE / REJECT / CANCEL / DELETE"
   },
   {
    "n": "SHEET_NAME",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "RECORD_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "PK of the changed row"
   },
   {
    "n": "FIELD_NAME",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Changed column (blank for CREATE)"
   },
   {
    "n": "OLD_VALUE",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "NEW_VALUE",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   }
  ]
 },
 "MST_USER": {
  "stage": "01",
  "module": "MASTERS",
  "entity": "USER",
  "pk": "USER_ID",
  "cols": [
   {
    "n": "USER_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "FULL_NAME",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "EMAIL",
    "t": "EMAIL",
    "r": "Y",
    "ref": "UNIQUE",
    "by": "USER",
    "d": "Google login email"
   },
   {
    "n": "PHONE",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "DEPARTMENT",
    "t": "TEXT",
    "r": "N",
    "ref": "SYS_LOOKUP(DEPARTMENT)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ROLE",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(ROLE)",
    "by": "USER",
    "d": "Drives MST_ROLE_PERMISSION. Requested at registration; admin can change"
   },
   {
    "n": "DEFAULT_LOCATION_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_LOCATION",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "ACTIVE / INACTIVE / PENDING / REJECTED",
    "by": "USER",
    "d": "PENDING = registered, waiting for admin approval"
   },
   {
    "n": "PASSWORD_HASH",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Salted SHA-256 hash – never shown or sent to the browser"
   },
   {
    "n": "PASSWORD_SALT",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Random salt for the hash"
   },
   {
    "n": "LAST_LOGIN",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last successful login"
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "MST_ROLE_PERMISSION": {
  "stage": "01",
  "module": "MASTERS",
  "entity": "",
  "pk": "",
  "cols": [
   {
    "n": "ROLE",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(ROLE)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "MODULE",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "Web-app module / screen"
   },
   {
    "n": "CAN_VIEW",
    "t": "Y/N",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CAN_CREATE",
    "t": "Y/N",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CAN_EDIT",
    "t": "Y/N",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CAN_APPROVE",
    "t": "Y/N",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   }
  ]
 },
 "MST_LOCATION": {
  "stage": "01",
  "module": "MASTERS",
  "entity": "LOCATION",
  "pk": "LOCATION_ID",
  "cols": [
   {
    "n": "LOCATION_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "LOCATION_NAME",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "LOCATION_TYPE",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(LOCATION_TYPE)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "PRJ_PROJECT",
    "by": "USER",
    "d": "Filled only for SITE STORE locations"
   },
   {
    "n": "ADDRESS",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CITY",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "MANAGER_USER_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "ACTIVE / INACTIVE",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "MST_CATEGORY": {
  "stage": "01",
  "module": "MASTERS",
  "entity": "CATEGORY",
  "pk": "CATEGORY_ID",
  "cols": [
   {
    "n": "CATEGORY_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "CATEGORY_CODE",
    "t": "TEXT",
    "r": "Y",
    "ref": "UNIQUE",
    "by": "USER",
    "d": "3-letter code, used in SKU"
   },
   {
    "n": "CATEGORY_NAME",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "DESCRIPTION",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "ACTIVE / INACTIVE",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "MST_SUBCATEGORY": {
  "stage": "01",
  "module": "MASTERS",
  "entity": "SUBCATEGORY",
  "pk": "SUBCATEGORY_ID",
  "cols": [
   {
    "n": "SUBCATEGORY_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "CATEGORY_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_CATEGORY",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SUBCATEGORY_NAME",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "DESCRIPTION",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "ACTIVE / INACTIVE",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "MST_UOM": {
  "stage": "01",
  "module": "MASTERS",
  "entity": "",
  "pk": "UOM_CODE",
  "cols": [
   {
    "n": "UOM_CODE",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "USER",
    "d": ""
   },
   {
    "n": "UOM_NAME",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "UOM_TYPE",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "COUNT / LENGTH / AREA / WEIGHT / VOLUME"
   },
   {
    "n": "DECIMAL_ALLOWED",
    "t": "Y/N",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "N = qty must be whole number"
   },
   {
    "n": "STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "ACTIVE / INACTIVE",
    "by": "USER",
    "d": ""
   }
  ]
 },
 "MST_WORK_STAGE": {
  "stage": "01",
  "module": "MASTERS",
  "entity": "",
  "pk": "STAGE_CODE",
  "cols": [
   {
    "n": "STAGE_CODE",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STAGE_NAME",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SEQUENCE",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "Normal execution order"
   },
   {
    "n": "DESCRIPTION",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "ACTIVE / INACTIVE",
    "by": "USER",
    "d": ""
   }
  ]
 },
 "MST_PRODUCT": {
  "stage": "01",
  "module": "MASTERS",
  "entity": "PRODUCT",
  "pk": "PRODUCT_ID",
  "cols": [
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "SKU",
    "t": "TEXT",
    "r": "Y",
    "ref": "UNIQUE",
    "by": "USER",
    "d": "e.g. WOD-PLY-18-BWP"
   },
   {
    "n": "PRODUCT_NAME",
    "t": "TEXT",
    "r": "Y",
    "ref": "UNIQUE",
    "by": "USER",
    "d": "Shown in every product dropdown – must be unique"
   },
   {
    "n": "CATEGORY_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_CATEGORY",
    "by": "USER",
    "d": "Category – list maintained in the Support sheet"
   },
   {
    "n": "SUBCATEGORY_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_SUBCATEGORY",
    "by": "USER",
    "d": "Sub-category of the selected category – list maintained in the Support sheet"
   },
   {
    "n": "BRAND",
    "t": "TEXT",
    "r": "N",
    "ref": "SYS_LOOKUP(BRAND)",
    "by": "USER",
    "d": "list maintained in the Support sheet"
   },
   {
    "n": "MODEL",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SPECIFICATION",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SIZE",
    "t": "TEXT",
    "r": "N",
    "ref": "SYS_LOOKUP(SIZE)",
    "by": "USER",
    "d": "e.g. 8x4 ft – list maintained in the Support sheet"
   },
   {
    "n": "THICKNESS",
    "t": "TEXT",
    "r": "N",
    "ref": "SYS_LOOKUP(THICKNESS)",
    "by": "USER",
    "d": "e.g. 18 mm – list maintained in the Support sheet"
   },
   {
    "n": "COLOR",
    "t": "TEXT",
    "r": "N",
    "ref": "SYS_LOOKUP(COLOR)",
    "by": "USER",
    "d": "list maintained in the Support sheet"
   },
   {
    "n": "FINISH",
    "t": "TEXT",
    "r": "N",
    "ref": "SYS_LOOKUP(FINISH)",
    "by": "USER",
    "d": "list maintained in the Support sheet"
   },
   {
    "n": "BASE_UOM",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_UOM",
    "by": "USER",
    "d": "Stock-keeping unit (ledger qty is in this unit)"
   },
   {
    "n": "PURCHASE_UOM",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_UOM",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PURCHASE_TO_BASE",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "1 PURCHASE_UOM = n BASE_UOM"
   },
   {
    "n": "ISSUE_UOM",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_UOM",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ISSUE_TO_BASE",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "1 ISSUE_UOM = n BASE_UOM"
   },
   {
    "n": "HSN_CODE",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "GST_PCT",
    "t": "PCT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "Store as number, e.g. 18"
   },
   {
    "n": "STANDARD_RATE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": "Estimate rate per BASE_UOM (used in BOM costing)"
   },
   {
    "n": "STANDARD_WASTAGE_PCT",
    "t": "PCT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": "Allowed wastage % added on top of BOM net qty"
   },
   {
    "n": "MIN_STOCK",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REORDER_LEVEL",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REORDER_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "MAX_STOCK",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "LEAD_TIME_DAYS",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PREFERRED_SUPPLIER_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_SUPPLIER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "IS_SERIALIZED",
    "t": "Y/N",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "IS_BATCH_TRACKED",
    "t": "Y/N",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "IS_EXPIRY_TRACKED",
    "t": "Y/N",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "IMAGE_URL",
    "t": "URL",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "ACTIVE / INACTIVE",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "MST_SUPPLIER": {
  "stage": "01",
  "module": "MASTERS",
  "entity": "SUPPLIER",
  "pk": "SUPPLIER_ID",
  "cols": [
   {
    "n": "SUPPLIER_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "SUPPLIER_NAME",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SUPPLIER_TYPE",
    "t": "TEXT",
    "r": "N",
    "ref": "SYS_LOOKUP(SUPPLIER_TYPE)",
    "by": "USER",
    "d": "MANUFACTURER / DEALER / CONTRACTOR"
   },
   {
    "n": "CONTACT_PERSON",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PHONE",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "EMAIL",
    "t": "EMAIL",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "GSTIN",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PAN",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ADDRESS",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CITY",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STATE",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PAYMENT_TERMS",
    "t": "TEXT",
    "r": "N",
    "ref": "SYS_LOOKUP(PAYMENT_TERMS)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREDIT_DAYS",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "BANK_NAME",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "BANK_ACCOUNT_NO",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "BANK_IFSC",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "RATING",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": "1-5, updated from GRN rejection % / delays"
   },
   {
    "n": "STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "ACTIVE / INACTIVE / BLACKLISTED",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "MST_SUPPLIER_PRICE": {
  "stage": "01",
  "module": "MASTERS",
  "entity": "SUPPLIER_PRICE",
  "pk": "PRICE_ID",
  "cols": [
   {
    "n": "PRICE_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "SUPPLIER_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_SUPPLIER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_PRODUCT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SUPPLIER_SKU",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "RATE",
    "t": "CURRENCY",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "Per PURCHASE_UOM, before GST"
   },
   {
    "n": "MOQ",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": "Minimum order qty"
   },
   {
    "n": "LEAD_TIME_DAYS",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "VALID_FROM",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "VALID_TO",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "ACTIVE / INACTIVE",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "PRJ_PROJECT": {
  "stage": "02",
  "module": "PROJECT",
  "entity": "",
  "pk": "PROJECT_ID",
  "cols": [
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYNC",
    "d": "Same ID as the lead / CRM system"
   },
   {
    "n": "LEAD_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYNC",
    "d": "Lead reference in CRM"
   },
   {
    "n": "PROJECT_NAME",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "SYNC",
    "d": ""
   },
   {
    "n": "CLIENT_NAME",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "SYNC",
    "d": ""
   },
   {
    "n": "CLIENT_PHONE",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYNC",
    "d": ""
   },
   {
    "n": "PROJECT_TYPE",
    "t": "TEXT",
    "r": "N",
    "ref": "SYS_LOOKUP(PROJECT_TYPE)",
    "by": "SYNC",
    "d": ""
   },
   {
    "n": "SITE_ADDRESS",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYNC",
    "d": ""
   },
   {
    "n": "CITY",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYNC",
    "d": ""
   },
   {
    "n": "SITE_LOCATION_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_LOCATION",
    "by": "USER",
    "d": "Site store created for this project"
   },
   {
    "n": "PROJECT_MANAGER_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "DESIGNER_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SITE_SUPERVISOR_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CLOSURE_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "SYNC",
    "d": "Lead closure / booking date"
   },
   {
    "n": "START_DATE",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "TARGET_END_DATE",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ACTUAL_END_DATE",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CONTRACT_VALUE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYNC",
    "d": ""
   },
   {
    "n": "MATERIAL_BUDGET",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Approved BOM cost (copied on BOM approval)"
   },
   {
    "n": "CURRENT_BOM_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "BOM_HEADER",
    "by": "SYSTEM",
    "d": "Latest APPROVED BOM"
   },
   {
    "n": "CURRENT_STAGE_CODE",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_WORK_STAGE",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PROJECT_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(PROJECT_STATUS)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "LAST_SYNCED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYNC",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "PRJ_STAGE": {
  "stage": "02",
  "module": "PROJECT",
  "entity": "PROJECT_STAGE",
  "pk": "PROJECT_STAGE_ID",
  "cols": [
   {
    "n": "PROJECT_STAGE_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PRJ_PROJECT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STAGE_CODE",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_WORK_STAGE",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SEQUENCE",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PLANNED_START",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PLANNED_END",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ACTUAL_START",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ACTUAL_END",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SUPERVISOR_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PROGRESS_PCT",
    "t": "PCT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": "0-100"
   },
   {
    "n": "BOM_COST",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Sum of BOM lines for this stage"
   },
   {
    "n": "ACTUAL_COST",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Net consumed cost for this stage"
   },
   {
    "n": "STAGE_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(STAGE_STATUS)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REMARKS",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "BOM_HEADER": {
  "stage": "03",
  "module": "BOM",
  "entity": "BOM",
  "pk": "BOM_ID",
  "cols": [
   {
    "n": "BOM_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PRJ_PROJECT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "BOM_VERSION",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "1, 2, 3 ..."
   },
   {
    "n": "BOM_TYPE",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(BOM_TYPE)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PARENT_BOM_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "BOM_HEADER",
    "by": "USER",
    "d": "Previous version this one revises"
   },
   {
    "n": "DRAWING_REF",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": "Drawing / design file link or number"
   },
   {
    "n": "PREPARED_BY",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PREPARED_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "TOTAL_LINES",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "TOTAL_ESTIMATED_COST",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "BOM_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(BOM_STATUS)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "IS_CURRENT",
    "t": "Y/N",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "APPROVED_BY",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "APPROVED_DATE",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REVISION_REASON",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REMARKS",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "BOM_ITEMS": {
  "stage": "03",
  "module": "BOM",
  "entity": "BOM_ITEM",
  "pk": "BOM_ITEM_ID",
  "cols": [
   {
    "n": "BOM_ITEM_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "BOM_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "BOM_HEADER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PRJ_PROJECT",
    "by": "SYSTEM",
    "d": "Denormalised for fast filtering"
   },
   {
    "n": "STAGE_CODE",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_WORK_STAGE",
    "by": "USER",
    "d": ""
   },
   {
    "n": "AREA",
    "t": "TEXT",
    "r": "N",
    "ref": "SYS_LOOKUP(AREA)",
    "by": "USER",
    "d": "Room / zone, e.g. KITCHEN"
   },
   {
    "n": "ELEMENT",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": "What is being built, e.g. WARDROBE-01"
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_PRODUCT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_NAME",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Snapshot at time of entry"
   },
   {
    "n": "UOM",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_UOM",
    "by": "SYSTEM",
    "d": "BASE_UOM of product"
   },
   {
    "n": "NET_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "Qty as per drawing"
   },
   {
    "n": "WASTAGE_PCT",
    "t": "PCT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": "Default from product / config"
   },
   {
    "n": "GROSS_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "NET_QTY x (1 + WASTAGE_PCT/100)"
   },
   {
    "n": "EST_RATE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": "Default from STANDARD_RATE"
   },
   {
    "n": "EST_AMOUNT",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "GROSS_QTY x EST_RATE"
   },
   {
    "n": "MATERIAL_SOURCE",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(MATERIAL_SOURCE)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REMARKS",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "PRJ_ALLOCATION": {
  "stage": "04",
  "module": "ALLOCATION",
  "entity": "ALLOCATION",
  "pk": "ALLOCATION_ID",
  "cols": [
   {
    "n": "ALLOCATION_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ALLOCATION_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PRJ_PROJECT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STAGE_CODE",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_WORK_STAGE",
    "by": "USER",
    "d": ""
   },
   {
    "n": "BOM_ITEM_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "BOM_ITEMS",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_PRODUCT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "LOCATION_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_LOCATION",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ALLOCATED_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CONSUMED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Issued against this allocation"
   },
   {
    "n": "RELEASED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": "Released back to free stock"
   },
   {
    "n": "OPEN_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "ALLOCATED - CONSUMED - RELEASED"
   },
   {
    "n": "ALLOCATION_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(ALLOCATION_STATUS)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ALLOCATED_BY",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "PUR_PR": {
  "stage": "05",
  "module": "PURCHASE_REQUEST",
  "entity": "PR",
  "pk": "PR_ID",
  "cols": [
   {
    "n": "PR_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PR_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PR_SOURCE",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(PR_SOURCE)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "PRJ_PROJECT",
    "by": "USER",
    "d": "Blank for general / reorder stock"
   },
   {
    "n": "BOM_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "BOM_HEADER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REQUESTED_BY",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "DEPARTMENT",
    "t": "TEXT",
    "r": "N",
    "ref": "SYS_LOOKUP(DEPARTMENT)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REQUIRED_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRIORITY",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(PRIORITY)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REASON",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ESTIMATED_VALUE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PR_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(PR_STATUS)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "APPROVED_BY",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "APPROVED_DATE",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REJECTION_REASON",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "PUR_PR_ITEMS": {
  "stage": "05",
  "module": "PURCHASE_REQUEST",
  "entity": "PR_ITEM",
  "pk": "PR_ITEM_ID",
  "cols": [
   {
    "n": "PR_ITEM_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PR_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PUR_PR",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "PRJ_PROJECT",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "STAGE_CODE",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_WORK_STAGE",
    "by": "USER",
    "d": ""
   },
   {
    "n": "BOM_ITEM_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "BOM_ITEMS",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_PRODUCT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_NAME",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "UOM",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_UOM",
    "by": "USER",
    "d": "BASE_UOM"
   },
   {
    "n": "REQUESTED_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "APPROVED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ORDERED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Sum of PO lines against this PR line"
   },
   {
    "n": "REQUIRED_DATE",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "LINE_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(PR_LINE_STATUS)",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "REMARKS",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "PUR_QUOTATION": {
  "stage": "05",
  "module": "PURCHASE_REQUEST",
  "entity": "QUOTE",
  "pk": "QUOTE_ID",
  "cols": [
   {
    "n": "QUOTE_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "QUOTE_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PR_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PUR_PR",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PR_ITEM_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PUR_PR_ITEMS",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SUPPLIER_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_SUPPLIER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_PRODUCT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "QUOTED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "QUOTED_RATE",
    "t": "CURRENCY",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "Per PURCHASE_UOM"
   },
   {
    "n": "GST_PCT",
    "t": "PCT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "FREIGHT",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "LEAD_TIME_DAYS",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "VALID_TILL",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "IS_SELECTED",
    "t": "Y/N",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ATTACHMENT_URL",
    "t": "URL",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "PUR_PO": {
  "stage": "05",
  "module": "PURCHASE_ORDER",
  "entity": "PO",
  "pk": "PO_ID",
  "cols": [
   {
    "n": "PO_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PO_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SUPPLIER_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_SUPPLIER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "PRJ_PROJECT",
    "by": "USER",
    "d": "Main project (lines can carry their own)"
   },
   {
    "n": "DELIVERY_LOCATION_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_LOCATION",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PAYMENT_TERMS",
    "t": "TEXT",
    "r": "N",
    "ref": "SYS_LOOKUP(PAYMENT_TERMS)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "EXPECTED_DELIVERY",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SUBTOTAL",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "DISCOUNT_TOTAL",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "GST_TOTAL",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "FREIGHT",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "GRAND_TOTAL",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PO_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(PO_STATUS)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "APPROVED_BY",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "APPROVED_DATE",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PO_PDF_URL",
    "t": "URL",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "REMARKS",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "PUR_PO_ITEMS": {
  "stage": "05",
  "module": "PURCHASE_ORDER",
  "entity": "PO_ITEM",
  "pk": "PO_ITEM_ID",
  "cols": [
   {
    "n": "PO_ITEM_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PO_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PUR_PO",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PR_ITEM_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "PUR_PR_ITEMS",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "PRJ_PROJECT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STAGE_CODE",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_WORK_STAGE",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_PRODUCT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_NAME",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PURCHASE_UOM",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_UOM",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ORDERED_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "UNIT_RATE",
    "t": "CURRENCY",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "DISCOUNT_PCT",
    "t": "PCT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "TAXABLE_AMOUNT",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "GST_PCT",
    "t": "PCT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "GST_AMOUNT",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "LINE_TOTAL",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "EXPECTED_DATE",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "RECEIVED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PENDING_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "LINE_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(PO_LINE_STATUS)",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "GRN_HEADER": {
  "stage": "06",
  "module": "GRN",
  "entity": "GRN",
  "pk": "GRN_ID",
  "cols": [
   {
    "n": "GRN_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "GRN_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PO_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PUR_PO",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SUPPLIER_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_SUPPLIER",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "PRJ_PROJECT",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "INVOICE_NO",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "INVOICE_DATE",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "INVOICE_AMOUNT",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CHALLAN_NO",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "VEHICLE_NO",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "RECEIVED_LOCATION_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_LOCATION",
    "by": "USER",
    "d": ""
   },
   {
    "n": "RECEIVED_BY",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "INSPECTED_BY",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "INSPECTION_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(INSPECTION_STATUS)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "GRN_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(GRN_STATUS)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ATTACHMENT_URL",
    "t": "URL",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": "Invoice / challan photo (Drive)"
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "GRN_ITEMS": {
  "stage": "06",
  "module": "GRN",
  "entity": "GRN_ITEM",
  "pk": "GRN_ITEM_ID",
  "cols": [
   {
    "n": "GRN_ITEM_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "GRN_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "GRN_HEADER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PO_ITEM_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PUR_PO_ITEMS",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "PRJ_PROJECT",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "STAGE_CODE",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_WORK_STAGE",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_PRODUCT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_NAME",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "RECEIVED_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "In PURCHASE_UOM"
   },
   {
    "n": "ACCEPTED_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REJECTED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "RECEIVED - ACCEPTED"
   },
   {
    "n": "REJECTION_REASON",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CONVERSION_FACTOR",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "PURCHASE_TO_BASE snapshot"
   },
   {
    "n": "ACCEPTED_BASE_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "ACCEPTED_QTY x CONVERSION_FACTOR"
   },
   {
    "n": "UNIT_RATE",
    "t": "CURRENCY",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Landed rate per BASE_UOM (excl. GST)"
   },
   {
    "n": "LINE_VALUE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "LOCATION_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_LOCATION",
    "by": "USER",
    "d": ""
   },
   {
    "n": "BIN_LOCATION",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "BATCH_NO",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SERIAL_NO",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "EXPIRY_DATE",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "PUR_RETURN": {
  "stage": "06",
  "module": "GRN",
  "entity": "RTV",
  "pk": "RTV_ID",
  "cols": [
   {
    "n": "RTV_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "RTV_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "GRN_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "GRN_HEADER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "GRN_ITEM_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "GRN_ITEMS",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SUPPLIER_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_SUPPLIER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_PRODUCT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "LOCATION_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_LOCATION",
    "by": "USER",
    "d": ""
   },
   {
    "n": "RETURN_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "BASE_UOM"
   },
   {
    "n": "FROM_STOCK",
    "t": "Y/N",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "Y = was accepted into stock (ledger OUT); N = rejected at gate"
   },
   {
    "n": "UNIT_RATE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "RETURN_VALUE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "REASON",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "DEBIT_NOTE_NO",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "RTV_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(RTV_STATUS)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "INV_LEDGER": {
  "stage": "07",
  "module": "INVENTORY",
  "entity": "TXN",
  "pk": "TXN_ID",
  "cols": [
   {
    "n": "TXN_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "TXN_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "TXN_TYPE",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(TXN_TYPE)",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "REF_SHEET",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Source sheet, e.g. GRN_ITEMS"
   },
   {
    "n": "REF_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Source header ID"
   },
   {
    "n": "REF_LINE_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Source line ID"
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_PRODUCT",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "LOCATION_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_LOCATION",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "PRJ_PROJECT",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "STAGE_CODE",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_WORK_STAGE",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "IN_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "BASE_UOM"
   },
   {
    "n": "OUT_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "BASE_UOM"
   },
   {
    "n": "UNIT_RATE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "TXN_VALUE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "+ for IN, - for OUT"
   },
   {
    "n": "BATCH_NO",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "USER_EMAIL",
    "t": "EMAIL",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   }
  ]
 },
 "INV_STOCK": {
  "stage": "07",
  "module": "INVENTORY",
  "entity": "",
  "pk": "STOCK_KEY",
  "cols": [
   {
    "n": "STOCK_KEY",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": "PRODUCT_ID|LOCATION_ID"
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_PRODUCT",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PRODUCT_NAME",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "CATEGORY_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_CATEGORY",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "LOCATION_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_LOCATION",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "UOM",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_UOM",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ON_HAND_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ALLOCATED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Sum of OPEN_QTY in PRJ_ALLOCATION"
   },
   {
    "n": "AVAILABLE_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "ON_HAND - ALLOCATED"
   },
   {
    "n": "ON_ORDER_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Sum of PENDING_QTY on open POs"
   },
   {
    "n": "AVG_RATE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "STOCK_VALUE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "REORDER_LEVEL",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "REORDER_STATUS",
    "t": "TEXT",
    "r": "N",
    "ref": "OK / LOW / OUT / OVERSTOCK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "LAST_TXN_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "INV_LEDGER",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "LAST_UPDATED",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   }
  ]
 },
 "INV_TRANSFER": {
  "stage": "07",
  "module": "INVENTORY",
  "entity": "TRANSFER",
  "pk": "TRANSFER_ID",
  "cols": [
   {
    "n": "TRANSFER_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "TRANSFER_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "FROM_LOCATION_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_LOCATION",
    "by": "USER",
    "d": ""
   },
   {
    "n": "TO_LOCATION_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_LOCATION",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "PRJ_PROJECT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REQUESTED_BY",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "APPROVED_BY",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "DISPATCHED_BY",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "RECEIVED_BY",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "RECEIVED_DATE",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "VEHICLE_NO",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "TRANSFER_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(TRANSFER_STATUS)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "INV_TRANSFER_ITEMS": {
  "stage": "07",
  "module": "INVENTORY",
  "entity": "TRANSFER_ITEM",
  "pk": "TRANSFER_ITEM_ID",
  "cols": [
   {
    "n": "TRANSFER_ITEM_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "TRANSFER_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "INV_TRANSFER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_PRODUCT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_NAME",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "UOM",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_UOM",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "DISPATCHED_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "RECEIVED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SHORT_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "DISPATCHED - RECEIVED"
   },
   {
    "n": "UNIT_RATE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "BATCH_NO",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REMARKS",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "INV_ADJUSTMENT": {
  "stage": "07",
  "module": "INVENTORY",
  "entity": "ADJUSTMENT",
  "pk": "ADJ_ID",
  "cols": [
   {
    "n": "ADJ_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ADJ_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_PRODUCT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "LOCATION_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_LOCATION",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SYSTEM_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "ON_HAND at time of count"
   },
   {
    "n": "PHYSICAL_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "DIFFERENCE_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "PHYSICAL - SYSTEM"
   },
   {
    "n": "UNIT_RATE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "VALUE_IMPACT",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "REASON",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(ADJUSTMENT_REASON)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ADJ_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "PENDING / APPROVED / REJECTED",
    "by": "USER",
    "d": ""
   },
   {
    "n": "APPROVED_BY",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "APPROVED_DATE",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "SITE_MR": {
  "stage": "08",
  "module": "SITE_REQUEST",
  "entity": "MR",
  "pk": "MR_ID",
  "cols": [
   {
    "n": "MR_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "MR_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PRJ_PROJECT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STAGE_CODE",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_WORK_STAGE",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REQUESTED_BY",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REQUIRED_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRIORITY",
    "t": "TEXT",
    "r": "N",
    "ref": "SYS_LOOKUP(PRIORITY)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "HAS_EXTRA_TO_BOM",
    "t": "Y/N",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Any line beyond BOM balance -> needs approval"
   },
   {
    "n": "MR_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(MR_STATUS)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "APPROVED_BY",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "APPROVED_DATE",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REMARKS",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "SITE_MR_ITEMS": {
  "stage": "08",
  "module": "SITE_REQUEST",
  "entity": "MR_ITEM",
  "pk": "MR_ITEM_ID",
  "cols": [
   {
    "n": "MR_ITEM_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "MR_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "SITE_MR",
    "by": "USER",
    "d": ""
   },
   {
    "n": "BOM_ITEM_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "BOM_ITEMS",
    "by": "USER",
    "d": "Blank only for extra (non-BOM) items"
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_PRODUCT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_NAME",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "UOM",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_UOM",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "BOM_BALANCE_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "BOM gross - already issued (at request time)"
   },
   {
    "n": "REQUESTED_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "APPROVED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ISSUED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "IS_EXTRA_TO_BOM",
    "t": "Y/N",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "EXTRA_REASON",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": "Mandatory when IS_EXTRA_TO_BOM = Y"
   },
   {
    "n": "LINE_STATUS",
    "t": "TEXT",
    "r": "N",
    "ref": "OPEN / PARTIALLY ISSUED / ISSUED / CANCELLED",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "SITE_ISSUE": {
  "stage": "08",
  "module": "SITE_ISSUE_RETURN",
  "entity": "ISSUE",
  "pk": "ISSUE_ID",
  "cols": [
   {
    "n": "ISSUE_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ISSUE_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "MR_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "SITE_MR",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PRJ_PROJECT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STAGE_CODE",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_WORK_STAGE",
    "by": "USER",
    "d": ""
   },
   {
    "n": "FROM_LOCATION_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_LOCATION",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ISSUED_TO",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "Supervisor / contractor name"
   },
   {
    "n": "ISSUED_BY",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PURPOSE",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ISSUE_VALUE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ACK_BY",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": "Site person who acknowledged receipt"
   },
   {
    "n": "ACK_DATE",
    "t": "DATE",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ISSUE_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(ISSUE_STATUS)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "SITE_ISSUE_ITEMS": {
  "stage": "08",
  "module": "SITE_ISSUE_RETURN",
  "entity": "ISSUE_ITEM",
  "pk": "ISSUE_ITEM_ID",
  "cols": [
   {
    "n": "ISSUE_ITEM_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ISSUE_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "SITE_ISSUE",
    "by": "USER",
    "d": ""
   },
   {
    "n": "MR_ITEM_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "SITE_MR_ITEMS",
    "by": "USER",
    "d": ""
   },
   {
    "n": "BOM_ITEM_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "BOM_ITEMS",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ALLOCATION_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "PRJ_ALLOCATION",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PRJ_PROJECT",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "STAGE_CODE",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_WORK_STAGE",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_PRODUCT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_NAME",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ISSUE_UOM",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_UOM",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ISSUED_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "In ISSUE_UOM"
   },
   {
    "n": "BASE_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "ISSUED_QTY x ISSUE_TO_BASE"
   },
   {
    "n": "UNIT_RATE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "AVG_RATE at time of issue"
   },
   {
    "n": "LINE_COST",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "RETURNED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "BATCH_NO",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "SERIAL_NO",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "SITE_RETURN": {
  "stage": "08",
  "module": "SITE_ISSUE_RETURN",
  "entity": "RETURN",
  "pk": "RETURN_ID",
  "cols": [
   {
    "n": "RETURN_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "RETURN_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PRJ_PROJECT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STAGE_CODE",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_WORK_STAGE",
    "by": "USER",
    "d": ""
   },
   {
    "n": "RETURNED_BY",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "RECEIVED_BY",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "TO_LOCATION_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_LOCATION",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REASON",
    "t": "TEXT",
    "r": "N",
    "ref": "SYS_LOOKUP(RETURN_REASON)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "RETURN_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(RETURN_STATUS)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "SITE_RETURN_ITEMS": {
  "stage": "08",
  "module": "SITE_ISSUE_RETURN",
  "entity": "RETURN_ITEM",
  "pk": "RETURN_ITEM_ID",
  "cols": [
   {
    "n": "RETURN_ITEM_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "RETURN_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "SITE_RETURN",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ISSUE_ITEM_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "SITE_ISSUE_ITEMS",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "STAGE_CODE",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_PRODUCT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_NAME",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "UOM",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_UOM",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "RETURNED_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "BASE_UOM"
   },
   {
    "n": "CONDITION",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(RETURN_CONDITION)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "USABLE_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "DAMAGED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "UNIT_RATE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Same rate it was issued at"
   },
   {
    "n": "CREDIT_VALUE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "USABLE_QTY x UNIT_RATE"
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "SITE_WASTAGE": {
  "stage": "08",
  "module": "WASTAGE_USAGE",
  "entity": "WASTAGE",
  "pk": "WASTE_ID",
  "cols": [
   {
    "n": "WASTE_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "WASTE_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "WASTE_SOURCE",
    "t": "TEXT",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": "SITE / STORE"
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "PRJ_PROJECT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STAGE_CODE",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_WORK_STAGE",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ISSUE_ITEM_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "SITE_ISSUE_ITEMS",
    "by": "USER",
    "d": ""
   },
   {
    "n": "LOCATION_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_LOCATION",
    "by": "USER",
    "d": "Required when WASTE_SOURCE = STORE"
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_PRODUCT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_NAME",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "UOM",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_UOM",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "WASTE_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "WASTE_TYPE",
    "t": "TEXT",
    "r": "Y",
    "ref": "SYS_LOOKUP(WASTE_TYPE)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REASON",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "UNIT_RATE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "WASTE_COST",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "IS_WITHIN_ALLOWANCE",
    "t": "Y/N",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Compared with BOM WASTAGE_PCT"
   },
   {
    "n": "PHOTO_URL",
    "t": "URL",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REPORTED_BY",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "APPROVED_BY",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "WASTE_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "PENDING / APPROVED / REJECTED",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "SITE_USAGE_LOG": {
  "stage": "08",
  "module": "WASTAGE_USAGE",
  "entity": "USAGE",
  "pk": "USAGE_ID",
  "cols": [
   {
    "n": "USAGE_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "USAGE_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PRJ_PROJECT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "STAGE_CODE",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_WORK_STAGE",
    "by": "USER",
    "d": ""
   },
   {
    "n": "AREA",
    "t": "TEXT",
    "r": "N",
    "ref": "SYS_LOOKUP(AREA)",
    "by": "USER",
    "d": ""
   },
   {
    "n": "ELEMENT",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "BOM_ITEM_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "BOM_ITEMS",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_PRODUCT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "PRODUCT_NAME",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "UOM",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_UOM",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "USED_QTY",
    "t": "NUMBER",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "WORK_DONE",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": "Short description of work completed"
   },
   {
    "n": "PHOTO_URL",
    "t": "URL",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "REPORTED_BY",
    "t": "TEXT",
    "r": "Y",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "PRJ_CLOSURE": {
  "stage": "09",
  "module": "CLOSURE",
  "entity": "CLOSURE",
  "pk": "CLOSURE_ID",
  "cols": [
   {
    "n": "CLOSURE_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PK",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "Y",
    "ref": "PRJ_PROJECT",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CLOSURE_DATE",
    "t": "DATE",
    "r": "Y",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "BOM_COST",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ISSUED_COST",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "RETURNED_CREDIT",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "WASTAGE_COST",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "NET_MATERIAL_COST",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "ISSUED - RETURNED"
   },
   {
    "n": "COST_VARIANCE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "NET_MATERIAL_COST - BOM_COST"
   },
   {
    "n": "VARIANCE_PCT",
    "t": "PCT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ALL_STAGES_COMPLETED",
    "t": "Y/N",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ALL_PO_CLOSED",
    "t": "Y/N",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "SITE_STOCK_CLEARED",
    "t": "Y/N",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Site balance returned / consumed"
   },
   {
    "n": "ALLOCATIONS_RELEASED",
    "t": "Y/N",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "REMARKS",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CLOSED_BY",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "APPROVED_BY",
    "t": "TEXT",
    "r": "N",
    "ref": "MST_USER",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CLOSURE_STATUS",
    "t": "TEXT",
    "r": "Y",
    "ref": "DRAFT / PENDING APPROVAL / CLOSED",
    "by": "USER",
    "d": ""
   },
   {
    "n": "CREATED_AT",
    "t": "DATETIME",
    "r": "Y",
    "ref": "",
    "by": "SYSTEM",
    "d": "Row creation timestamp"
   },
   {
    "n": "CREATED_BY",
    "t": "EMAIL",
    "r": "Y",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Logged-in user who created the row"
   },
   {
    "n": "UPDATED_AT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "Last edit timestamp"
   },
   {
    "n": "UPDATED_BY",
    "t": "EMAIL",
    "r": "N",
    "ref": "MST_USER.EMAIL",
    "by": "SYSTEM",
    "d": "Last user who edited the row"
   }
  ]
 },
 "RPT_BOM_VS_ACTUAL": {
  "stage": "09",
  "module": "REPORTS",
  "entity": "",
  "pk": "",
  "cols": [
   {
    "n": "ROW_KEY",
    "t": "TEXT",
    "r": "N",
    "ref": "PROJECT|STAGE|PRODUCT",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "STAGE_CODE",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PRODUCT_NAME",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "UOM",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "BOM_GROSS_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ALLOCATED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PR_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PO_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "RECEIVED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ISSUED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "RETURNED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "WASTAGE_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "USED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "NET_CONSUMED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "ISSUED - RETURNED"
   },
   {
    "n": "SITE_BALANCE_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "NET_CONSUMED - WASTAGE - USED"
   },
   {
    "n": "BALANCE_TO_ISSUE",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "BOM_GROSS - NET_CONSUMED (stage left)"
   },
   {
    "n": "QTY_VARIANCE",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "NET_CONSUMED - BOM_GROSS (+ = overuse)"
   },
   {
    "n": "BOM_COST",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ACTUAL_COST",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "COST_VARIANCE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "LAST_REBUILT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   }
  ]
 },
 "RPT_PROJECT_COST": {
  "stage": "09",
  "module": "REPORTS",
  "entity": "",
  "pk": "",
  "cols": [
   {
    "n": "PROJECT_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "STAGE_CODE",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "CATEGORY_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "CATEGORY_NAME",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "BOM_COST",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ISSUED_COST",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "RETURNED_CREDIT",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "WASTAGE_COST",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "NET_COST",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "VARIANCE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "LAST_REBUILT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   }
  ]
 },
 "RPT_STOCK_MOVEMENT": {
  "stage": "09",
  "module": "REPORTS",
  "entity": "",
  "pk": "",
  "cols": [
   {
    "n": "PERIOD",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": "YYYY-MM"
   },
   {
    "n": "PRODUCT_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "PRODUCT_NAME",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "LOCATION_ID",
    "t": "TEXT",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "OPENING_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "GRN_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ISSUED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "RETURNED_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "WASTAGE_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "TRANSFER_IN_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "TRANSFER_OUT_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "ADJUSTMENT_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "RTV_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "CLOSING_QTY",
    "t": "NUMBER",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "CLOSING_VALUE",
    "t": "CURRENCY",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   },
   {
    "n": "LAST_REBUILT",
    "t": "DATETIME",
    "r": "N",
    "ref": "",
    "by": "SYSTEM",
    "d": ""
   }
  ]
 }
};
