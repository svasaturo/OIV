/*
 *    Copyright (C) 2019  Consiglio Nazionale delle Ricerche
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU Affero General Public License as
 *     published by the Free Software Foundation, either version 3 of the
 *     License, or (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU Affero General Public License for more details.
 *
 *     You should have received a copy of the GNU Affero General Public License
 *     along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

package it.cnr.si.cool.jconon.model;

import java.io.Serializable;

public class HelpdeskBean implements Serializable {
	/**
	 *
	 */
	private static final long serialVersionUID = 1109228412879923676L;
	private String firstName;
	private String lastName;
	private String email;
	private String confirmEmail;
	private String subject;
	private String message;
	private String category;
	private String problemType;
	private String phoneNumber;
	private String matricola;
	private String ip;
	private String call;

	private String id;
	private String azione;

	private boolean confirmRequested;

	public String getPhoneNumber() {
		return phoneNumber;
	}
	public void setPhoneNumber(String phoneNumber) {
		this.phoneNumber = phoneNumber;
	}
	public String getCategory() {
		return category;
	}
	public void setCategory(String category) {
		this.category = category;
	}

	public String getFirstName() {
		return firstName;
	}
	public void setFirstName(String firstName) {
		this.firstName = firstName;
	}
	public String getLastName() {
		return lastName;
	}
	public void setLastName(String lastName) {
		this.lastName = lastName;
	}
	public String getEmail() {
		return email;
	}
	public void setEmail(String email) {
		this.email = email;
	}
	public String getConfirmEmail() {
		return confirmEmail;
	}
	public void setConfirmEmail(String confirmEmail) {
		this.confirmEmail = confirmEmail;
	}
	public String getSubject() {
		return subject;
	}
	public void setSubject(String subject) {
		this.subject = subject;
	}
	public String getMessage() {
		return message;
	}
	public void setMessage(String message) {
		this.message = message;
	}
	public String getProblemType() {
		return problemType;
	}
	public void setProblemType(String problemType) {
		this.problemType = problemType;
	}
	public void setCall(String call) {
		this.call = call;
	}

	public String getCall() {
		return call;

	}

	public String getId() {
		return id;
	}
	public void setId(String id) {
		this.id = id;
	}
	public String getAzione() {
		return azione;
	}
	public void setAzione(String azione) {
		this.azione = azione;
	}
	public boolean isValid() {
		return !(firstName == null || lastName == null || email == null || category == null);
	}
	public String getMatricola() {
		return matricola;
	}
	public void setMatricola(String matricola) {
		this.matricola = matricola;
	}
	public String getIp() {
		return ip;
	}
	public void setIp(String ip) {
		this.ip = ip;
	}

	public boolean isConfirmRequested() {
		return confirmRequested;
	}

	public void setConfirmRequested(boolean confirmRequested) {
		this.confirmRequested = confirmRequested;
	}
}
