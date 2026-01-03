import request from "supertest";
import { expect } from "chai";
import app from "../app/index.app.js";

describe("Auth integration tests", () => {
  const testEmail = `nathan.${Date.now()}@example.com`;
  const testPassword = "Test123--";

  it("POST /api/auth/register - crée un nouvel utilisateur", async () => {
    const res = await request(app).post("/api/auth/register").send({
      firstname: "Nathan",
      lastname: "Testeur",
      email: testEmail,
      password: testPassword,
      birthdate: "1997-04-10",
    });

    expect([200, 201]).to.include(res.status);
    expect(res.body).to.have.property("status", "success");
    expect(res.body).to.have.property("data", true); // correspond à ton backend
  });

  it("POST /api/auth/login - connecte un utilisateur existant", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testEmail,
      password: testPassword,
    });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("status", "success");
    expect(res.body).to.have.property("data");
    expect(res.body.data).to.have.property("token"); // token directement dans data
    expect(res.body.data).to.have.property("firstname");
    expect(res.body.data).to.have.property("lastname");
    expect(res.body.data).to.have.property("email");
    expect(res.body.data.email).to.equal(testEmail);
  });
});
