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

package it.cnr.si.cool.jconon.rest;

import com.fasterxml.jackson.core.JsonProcessingException;
import it.cnr.cool.cmis.service.CMISService;
import it.cnr.cool.listener.LogoutListener;
import it.cnr.cool.security.service.UserService;
import it.cnr.cool.security.service.impl.alfresco.CMISGroup;
import it.cnr.cool.security.service.impl.alfresco.CMISUser;
import it.cnr.cool.service.CommonRestService;
import it.cnr.cool.util.StringUtil;
import it.cnr.si.cool.jconon.repository.CommonRepository;
import org.apache.chemistry.opencmis.client.bindings.spi.BindingSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.annotation.PostConstruct;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.*;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.*;

/**
 * Created by francesco on 13/07/15.
 */

@Path("common")
@Component
@Produces(MediaType.APPLICATION_JSON)
public class CommonRest {

    private static final Logger LOGGER = LoggerFactory.getLogger(CommonRest.class);

    @Autowired
    private CMISService cmisService;
    @Autowired
    private CommonRestService commonRestService;
    @Autowired
    private CommonRepository commonRepository;
    @Autowired
	private UserService userService;
    
	@Inject
    private Environment env;

    @GET
    public Response get(@Context HttpServletRequest req, @QueryParam("pageId") String pageId) throws JsonProcessingException {
        CMISUser user = cmisService.getCMISUserFromSession(req);
        BindingSession bindingSession = cmisService
                .getCurrentBindingSession(req);
        Map<String, Object> model = commonRestService.getStringObjectMap(user);
        model.put("groupsHash", getMd5(user.getGroups()));
        model.put("enableTypeCalls", commonRepository.getEnableTypeCalls(user.getId(), user, bindingSession));
        model.put("managers-call", commonRepository.getManagersCall(user.getId(), bindingSession));
        model.put("bootstrapVersion", "2");  
        Optional.ofNullable(pageId).map(x -> model.put("pageId", x));
        Optional.ofNullable(env.getProperty("analytics.id")).map(x -> model.put("ga", x));
        Optional.ofNullable(env.getActiveProfiles())
                .map(x -> model.put("profile", x));
        return commonRestService.getResponse(model);
    }
    
    @DELETE
    public void delete(@Context HttpServletRequest req, @QueryParam("authortiyName") String authortiyName) {
        BindingSession bindingSession = cmisService
                .getCurrentBindingSession(req);
        if (authortiyName != null) {
            if (authortiyName.startsWith("GROUP_")) {
            	for (String username : userService.findMembers(authortiyName, bindingSession)) {
                	commonRepository.evictEnableTypeCalls(username);
                	commonRepository.evictManagersCall(username);
    			}            	
            } else {
            	commonRepository.evictEnableTypeCalls(authortiyName);
            	commonRepository.evictManagersCall(authortiyName);
            }
        }
    }

    static String getMd5(List<CMISGroup> cmisGroups) {

        if (cmisGroups == null) {
            return "";
        }

        List<String> groups = new ArrayList<>();

        for (CMISGroup group: cmisGroups) {
            String group_name = group.getGroup_name();
            LOGGER.debug(group_name);
            groups.add(group_name);
        }

        Collections.sort(groups);
        String groupsConcatenation = StringUtils.collectionToDelimitedString(groups, "-");
        LOGGER.debug(groupsConcatenation);
        String md5 = StringUtil.getMd5(groupsConcatenation.getBytes());
        LOGGER.debug(md5);
        return md5;
    }
	@PostConstruct
	public void init() {
		userService.addLogoutListener(new LogoutListener() {			
			@Override
			public void logout(String userId) {
				commonRepository.evictEnableTypeCalls(userId);
				commonRepository.evictManagersCall(userId);				
			}
		});		
	}    
    
}