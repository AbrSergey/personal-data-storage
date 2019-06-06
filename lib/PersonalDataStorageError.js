class PersonalDataStorageError extends Error {
  constructor(message, status = 500){
    super(message);
    this.name = "PersonalDataStorageError";
    this.status = status;
  }
}

module.exports = PersonalDataStorageError;
