# personal-data-storage
Module for NodeJs, which allows to safely store personal data according to PCI DSS.



schema = {
  column_1: {
    validation: { object },
    security: bool,
    search: "entire" || "word"
  }
}