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

package it.cnr.si.cool.jconon.service.cache;

import it.cnr.cool.cmis.model.CoolPropertyIds;
import it.cnr.cool.cmis.service.ACLService;
import it.cnr.cool.cmis.service.CMISService;
import it.cnr.cool.security.service.UserService;
import it.cnr.cool.service.I18nService;
import it.cnr.si.cool.jconon.cmis.model.JCONONDocumentType;
import it.cnr.si.cool.jconon.cmis.model.JCONONFolderType;
import it.cnr.si.cool.jconon.cmis.model.JCONONPolicyType;
import it.cnr.si.cool.jconon.cmis.model.JCONONPropertyIds;
import it.cnr.si.cool.jconon.repository.CacheRepository;
import it.cnr.si.cool.jconon.repository.CallRepository;
import it.cnr.si.cool.jconon.service.TypeService;
import it.cnr.si.opencmis.criteria.Criteria;
import it.cnr.si.opencmis.criteria.CriteriaFactory;
import it.cnr.si.opencmis.criteria.restrictions.Restrictions;
import org.apache.chemistry.opencmis.client.api.*;
import org.apache.chemistry.opencmis.commons.PropertyIds;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.DependsOn;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Properties;

@Service
@DependsOn(value="RRDService")
public class CompetitionFolderService implements InitializingBean{

	private static final Logger LOGGER = LoggerFactory.getLogger(CompetitionFolderService.class);

	@Autowired
	private CMISService cmisService;

	@Autowired
	private ACLService aclService;
    @Autowired
    private TypeService typeService;
	@Autowired
    private CallRepository callRepository;
    @Autowired
    private I18nService i18NService;
	@Autowired 
	private UserService userService;

	@Autowired
    private CacheRepository cacheRepository;
	
	@Override
	public void afterPropertiesSet() throws Exception {
		cacheRepository.getCompetitionFolder();
	}
	
	public JSONObject getCompetitionFolder() {
		return new JSONObject(cacheRepository.getCompetitionFolder());
	}
	
    public Folder getMacroCall(Session cmisSession, Folder call) {
        Folder currCall = call;
        while (currCall != null && !currCall.getType().getId().equals(JCONONFolderType.JCONON_COMPETITION.value())) {
            if (typeService.hasSecondaryType(currCall, JCONONPolicyType.JCONON_MACRO_CALL.value()))
            	break;
            currCall = currCall.getFolderParent();
        }
        return currCall.equals(call) ||  currCall.getType().getId().equals(JCONONFolderType.JCONON_COMPETITION.value()) ? null : currCall;
    }	

    public String getCallGroupCommissioneName(Folder call) {
        return call.getProperty(JCONONPropertyIds.CALL_COMMISSIONE.value()).getValueAsString();
    }
    
    public String findAttachmentId(Session cmisSession, String source, JCONONDocumentType documentType, boolean fullNodeRef) {
        Criteria criteria = CriteriaFactory.createCriteria(documentType.queryName());
        criteria.addColumn(PropertyIds.OBJECT_ID);
        if (fullNodeRef)
        	criteria.addColumn(CoolPropertyIds.ALFCMIS_NODEREF.value());
        criteria.addColumn(PropertyIds.NAME);
        criteria.add(Restrictions.inFolder(source));
        ItemIterable<QueryResult> iterable = criteria.executeQuery(cmisSession, false, cmisSession.getDefaultContext());
        for (QueryResult queryResult : iterable) {
            return (String) queryResult.getPropertyById(fullNodeRef ? CoolPropertyIds.ALFCMIS_NODEREF.value() : PropertyIds.OBJECT_ID).getFirstValue();
        }
        return null;    	
    }    
    public String findAttachmentId(Session cmisSession, String source, JCONONDocumentType documentType) {
    	return findAttachmentId(cmisSession, source, documentType, false);
    }
    
    public Properties getDynamicLabels(ObjectId objectId, Session cmisSession) {
		LOGGER.debug("loading dynamic labels for " + objectId);
        Properties labels = callRepository.getLabelsForObjectId(objectId.getId(), cmisSession);
		return labels;
	}
    
    public String getCallName(Folder call) {
        String codiceBando = call.getPropertyValue(JCONONPropertyIds.CALL_CODICE.value());
        String name = i18NService.getLabel("call.name", Locale.ITALIAN).concat(" ").concat(codiceBando);
        if (call.getPropertyValue(JCONONPropertyIds.CALL_SEDE.value()) != null)
            name = name.concat(" - ").
                    concat(call.getPropertyValue(JCONONPropertyIds.CALL_SEDE.value()).toString());        
        return name;
    }    
}