# 📚 Library Management System

A simple **Library Management System** built using **Java, Spring Boot, Spring Data JPA, Hibernate, PostgreSQL, and HTML**.

This project provides basic functionality for managing books in a library, including adding, viewing, updating, and deleting book records.

---

## 🚀 Features

* ➕ Add new books
* 📖 View all available books
* 🔍 Search/manage book records
* ✏️ Update book details
* 🗑️ Delete books
* 🟢 Track book availability
* 🗄️ Store book data in PostgreSQL
* 🔗 REST API-based backend
* 🌐 Web interface
* ⚙️ Automatic database table creation/update using Hibernate

---

## 🛠️ Technologies Used

| Technology        | Purpose                       |
| ----------------- | ----------------------------- |
| Java              | Programming Language          |
| Spring Boot 3.2.0 | Backend Framework             |
| Spring Data JPA   | Database Operations           |
| Hibernate         | ORM                           |
| PostgreSQL        | Database                      |
| Maven             | Build & Dependency Management |
| HTML              | Frontend                      |
| Apache Tomcat     | Embedded Web Server           |

---

## 📂 Project Structure

```text
LibraryManagement
│
├── src
│   ├── main
│   │   ├── java
│   │   │   └── com.example.demo
│   │   │       ├── controller
│   │   │       │   └── BookController.java
│   │   │       │
│   │   │       ├── entity
│   │   │       │   └── Book.java
│   │   │       │
│   │   │       ├── repository
│   │   │       │   └── BookRepository.java
│   │   │       │
│   │   │       ├── service
│   │   │       │   └── BookService.java
│   │   │       │
│   │   │       └── LibraryManagementApplication.java
│   │   │
│   │   └── resources
│   │       ├── static
│   │       │   └── index.html
│   │       │
│   │       └── application.properties
│   │
│   └── test
│       └── java
│
├── pom.xml
├── mvnw
├── mvnw.cmd
└── .gitignore
```

---

## 🏗️ Architecture

The application follows a layered architecture:

```text
Client / Browser
       ↓
   Controller
       ↓
     Service
       ↓
   Repository
       ↓
 Spring Data JPA
       ↓
    Hibernate
       ↓
   PostgreSQL
```

### Controller

Handles incoming HTTP requests and communicates with the service layer.

### Service

Contains the application's business logic.

### Repository

Uses Spring Data JPA to communicate with the database.

### Entity

Represents the `Book` table in PostgreSQL.

---

## 🗃️ Database Configuration

This project uses **PostgreSQL**.

Create a database named:

```sql
CREATE DATABASE librarydb;
```

The application uses the following configuration:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/librarydb
spring.datasource.username=postgres
spring.datasource.password=${DB_PASSWORD}
```

### 🔐 Environment Variable

The PostgreSQL password is intentionally **not stored in this repository**.

Set the environment variable:

```text
DB_PASSWORD=<your-postgresql-password>
```

If you are using Eclipse/STS:

**Run → Run Configurations → Spring Boot App → Environment → New**

Add:

```text
Name: DB_PASSWORD
Value: Your PostgreSQL password
```

---

## ▶️ How to Run the Project

### 1. Clone the repository

```bash
git clone https://github.com/Sonalisahu728/LibraryManagement.git
```

### 2. Open the project

Open the project in:

* Spring Tool Suite
* Eclipse
* IntelliJ IDEA
* VS Code

### 3. Configure PostgreSQL

Make sure PostgreSQL is running and the `librarydb` database exists.

### 4. Configure the database password

Set:

```text
DB_PASSWORD
```

to your PostgreSQL password.

### 5. Run the application

Run:

```text
LibraryManagementApplication.java
```

Or using Maven:

```bash
mvn spring-boot:run
```

### 6. Open the application

Visit:

```text
http://localhost:8083
```

---

## 📡 API

The application provides endpoints for managing books.

| Method | Endpoint      | Description    |
| ------ | ------------- | -------------- |
| GET    | `/books`      | Get all books  |
| POST   | `/books`      | Add a new book |
| PUT    | `/books/{id}` | Update a book  |
| DELETE | `/books/{id}` | Delete a book  |

> Endpoint paths may vary depending on the controller mappings in the project.

---

## 📖 Book Model

A book contains information such as:

```text
id
title
author
genre
available
```

Example:

```json
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "genre": "Programming",
  "available": true
}
```

---

## 🧪 Testing

The project contains a Spring Boot test structure under:

```text
src/test/java
```

Tests can be executed using:

```bash
mvn test
```

---

## 🔒 Security

Sensitive credentials should not be committed to GitHub.

The database password is loaded using:

```properties
spring.datasource.password=${DB_PASSWORD}
```

The `.gitignore` file also prevents generated build files such as `target/` from being committed.

**Never commit real passwords, API keys, tokens, or other secrets to the repository.**

---

## 🔮 Future Improvements

Possible improvements for the project include:

* 👤 User authentication and authorization
* 🔑 Role-based access control
* 📚 Book borrowing and returning
* 👨‍🎓 Student/member management
* 🔍 Advanced book search and filtering
* 📄 Pagination and sorting
* 📊 Admin dashboard
* ✅ More comprehensive unit and integration tests
* 🐳 Docker support
* ☁️ Cloud deployment

---

## 👩‍💻 Author

**Sonali Sahu**

GitHub:
https://github.com/Sonalisahu728

---

## ⭐ If you find this project useful

Feel free to explore the repository, use the project for learning, and suggest improvements.
