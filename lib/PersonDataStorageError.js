class PersonDataStorageError extends Error {
  constructor(message, status = 500){
    super(message);
    this.type = "PersonDataStorageError";
    this.status = status;
  }
}

module.exports = PersonDataStorageError;