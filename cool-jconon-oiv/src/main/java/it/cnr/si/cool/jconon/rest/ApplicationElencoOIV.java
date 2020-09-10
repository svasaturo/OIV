package it.cnr.si.cool.jconon.rest;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.QueryParam;

import org.apache.chemistry.opencmis.client.bindings.impl.CmisBindingsHelper;
import org.apache.chemistry.opencmis.client.bindings.spi.BindingSession;
import org.apache.chemistry.opencmis.client.bindings.spi.http.Response;
import org.apache.chemistry.opencmis.commons.impl.UrlBuilder;
import org.apache.commons.httpclient.HttpStatus;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import it.cnr.cool.cmis.service.CMISService;
import it.cnr.cool.exception.CoolUserFactoryException;
import it.cnr.cool.security.SecurityChecked;
import it.cnr.cool.util.StringUtil;

@Path("controllo")
@Component
@SecurityChecked(needExistingSession = false, checkrbac = false)
public class ApplicationElencoOIV {
	
	private static final String SERVICE_CNR_PERSON_PEOPLE = "service/cnr/person/people";
	
    private static final Logger LOGGER = LoggerFactory.getLogger(ApplicationElencoOIV.class);
    @Autowired
    private CMISService cmisService;

    
	 @GET
	 @Path("codiceFiscale") 
	public boolean controlloCF(@QueryParam("cf") String cf) 
	 {
		 BindingSession cmisSession = cmisService.getAdminSession();
		 String link = cmisService.getBaseURL().concat(SERVICE_CNR_PERSON_PEOPLE).concat("?filter=codicefiscale:" + cf.toUpperCase());
	        UrlBuilder url = new UrlBuilder(link);  
	        LOGGER.error("@@@@@@" + cmisService.getBaseURL());
			Response resp = CmisBindingsHelper.getHttpInvoker(cmisSession).invokeGET(url, cmisSession);
			int status = resp.getResponseCode();
			LOGGER.error("########" + status);
			if (status == HttpStatus.SC_NOT_FOUND
					|| status == HttpStatus.SC_BAD_REQUEST
					|| status == HttpStatus.SC_INTERNAL_SERVER_ERROR) {
				throw new CoolUserFactoryException("User not found "+cf+" Exception: "+resp.getErrorContent());
			}
			try {
				JSONObject jsonObject = new JSONObject(StringUtil.convertStreamToString(resp.getStream()));
				JSONArray jsonArray = jsonObject.getJSONArray("people");
				LOGGER.error("********************" + jsonArray.length());
				
				if (jsonArray.length() == 0)
					return false;
				else if (jsonArray.length() >= 1) {
					return true;
				}else {
					throw new CoolUserFactoryException("For this tax code "+cf+" found user: "+ jsonArray.length());
				}
			} catch (JSONException e) {
				LOGGER.error("json exception", e);
				return false;
			}
		}
}