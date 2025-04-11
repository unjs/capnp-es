import { AddressBook } from "./addressbook";

const book = AddressBook.init()

book._initPeople(1)
book.people[0].name = "Alice"
book.people[0].id = 123
book.people[0].email = "alice@exmample.com"

console.log(book);
