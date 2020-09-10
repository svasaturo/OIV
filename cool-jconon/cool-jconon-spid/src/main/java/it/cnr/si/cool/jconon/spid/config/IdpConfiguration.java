/*
 * Copyright (C) 2019  Consiglio Nazionale delle Ricerche
 *
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

package it.cnr.si.cool.jconon.spid.config;

import com.hazelcast.core.HazelcastInstance;
import it.cnr.si.cool.jconon.spid.model.SPIDRequest;
import org.opensaml.saml2.core.AuthnRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

import java.util.Map;

@Configuration
@EnableConfigurationProperties(SpidProperties.class)
@PropertySource(value = "classpath:idp.yml", factory = YamlPropertyLoaderFactory.class)
public class IdpConfiguration {

    private final SpidProperties spidProperties;

    @Autowired
    private HazelcastInstance hazelcastInstance;

    @Autowired
    public IdpConfiguration(SpidProperties properties) {
        this.spidProperties = properties;
    }

    public SpidProperties getSpidProperties() {
        return spidProperties;
    }


}
