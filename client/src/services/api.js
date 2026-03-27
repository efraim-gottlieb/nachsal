const API_BASE = "";

class API {
  async updatePhone(phone) {
    return this.request("PUT", "/api/users/phone", { phone });
  }

  constructor() {
    this.token = localStorage.getItem("token");
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem("token", token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  getUser() {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  }

  setUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
  }

  async getOrefAlerts() {
    return this.request("GET", "/api/oref-alerts");
  }

  async request(method, path, body = null) {
    const headers = { "Content-Type": "application/json" };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  }

  async login(email, password) {
    const data = await this.request("POST", "/api/auth/login", { email, password });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  }

  async register(userData) {
    const data = await this.request("POST", "/api/auth/register", userData);
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  }

  async getMe() {
    return this.request("GET", "/api/auth/me");
  }

  async updateLocation(city, lat, lng) {
    return this.request("PUT", "/api/users/location", { city, lat, lng });
  }

  async getAllSoldiers() {
    return this.request("GET", "/api/users/soldiers");
  }

  async getMySoldiers() {
    return this.request("GET", "/api/users/my-soldiers");
  }

  async getSoldierCities() {
    return this.request("GET", "/api/users/soldier-cities");
  }

  async triggerEvent(cities) {
    return this.request("POST", "/api/events", { cities });
  }

  async getActiveEvents() {
    return this.request("GET", "/api/events/active");
  }

  async getAllEvents() {
    return this.request("GET", "/api/events");
  }

  async getEventStatuses(eventId) {
    return this.request("GET", `/api/events/${eventId}/statuses`);
  }

  async endEvent(eventId) {
    return this.request("PUT", `/api/events/${eventId}/end`);
  }

  async respondToEvent(eventId, status) {
    return this.request("POST", "/api/status/respond", { event_id: eventId, status });
  }

  async getPendingSurveys() {
    return this.request("GET", "/api/status/pending");
  }

  async createSoldier(data) {
    return this.request("POST", "/api/users/soldiers", data);
  }

  async updateSoldier(id, data) {
    return this.request("PUT", `/api/users/${id}`, data);
  }

  async deleteSoldier(id) {
    return this.request("DELETE", `/api/users/${id}`);
  }

  // Commanders
  async getAllCommanders() {
    return this.request("GET", "/api/users/commanders");
  }

  async createCommander(data) {
    return this.request("POST", "/api/users/commanders", data);
  }

  async updateCommander(id, data) {
    return this.request("PUT", `/api/users/commanders/${id}`, data);
  }

  async deleteCommander(id) {
    return this.request("DELETE", `/api/users/commanders/${id}`);
  }

  async toggleCommanderSms(id, sms_alerts) {
    return this.request("PUT", `/api/users/commanders/${id}/sms`, { sms_alerts });
  }

  // Location Requests
  async sendLocationRequest() {
    return this.request("POST", "/api/location-requests");
  }

  async getLatestLocationRequest() {
    return this.request("GET", "/api/location-requests/latest");
  }

  async getAllLocationRequests() {
    return this.request("GET", "/api/location-requests");
  }

  async getLocationRequestStatuses(id) {
    return this.request("GET", `/api/location-requests/${id}/statuses`);
  }

  async closeLocationRequest(id) {
    return this.request("PUT", `/api/location-requests/${id}/close`);
  }

  async toggleLocationOverride(requestId, soldierId) {
    return this.request("PUT", `/api/location-requests/${requestId}/override/${soldierId}`);
  }

  async overrideSoldierStatus(statusId, status) {
    return this.request("PUT", `/api/status/${statusId}/override`, { status });
  }

  async sendPersonalLocationRequest(soldierId) {
    return this.request("POST", `/api/location-requests/personal/${soldierId}`);
  }
}

export const api = new API();
