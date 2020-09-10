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

package it.cnr.si.cool.jconon.configuration;

import org.apache.catalina.Context;
import org.apache.catalina.connector.Connector;
import org.apache.catalina.valves.RemoteIpValve;
import org.apache.catalina.webresources.StandardRoot;
import org.apache.coyote.ProtocolHandler;
import org.apache.coyote.ajp.AjpNioProtocol;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.servlet.server.ServletWebServerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Created by francesco on 03/07/15.
 */

//TODO: spostare in cool-common!
@Configuration
@Profile("!test")
public class AjpConfiguration {

    @Value("${ajp.port}")
    private int ajpPort;

    @Value("${ajp.timeout}")
    private int ajpTimeout;

    private static final Logger LOGGER = LoggerFactory.getLogger(AjpConfiguration.class);

    @Bean
    @SuppressWarnings("static-method")
    public ServletWebServerFactory servletContainer() {
        TomcatServletWebServerFactory tomcat = new TomcatServletWebServerFactory() {
            @Override
            protected void postProcessContext(Context context) {
                final int cacheSize = 40 * 1024;
                StandardRoot standardRoot = new StandardRoot(context);
                standardRoot.setCacheMaxSize(cacheSize);
                context.setResources(standardRoot); // This is what made it work in my case.
                logger.info(String.format("New cache size (KB): %d", context.getResources().getCacheMaxSize()));
            }
        };

        Connector connector = new Connector("AJP/1.3");
        connector.setPort(ajpPort);

        ProtocolHandler p = connector.getProtocolHandler();

        if (p instanceof AjpNioProtocol) {
            LOGGER.info("set ajp timeout to " + ajpTimeout);
            AjpNioProtocol a = (AjpNioProtocol) p;
            a.setConnectionTimeout(ajpTimeout);
        } else {
            LOGGER.warn("error setting AJP connection timeout, using default");
        }

        tomcat.addAdditionalTomcatConnectors(connector);
        tomcat.addContextValves(createRemoteIpValves());
        return tomcat;
    }

    private static RemoteIpValve createRemoteIpValves() {
        RemoteIpValve remoteIpValve = new RemoteIpValve();
        remoteIpValve.setRemoteIpHeader("x-forwarded-for");
        remoteIpValve.setProtocolHeader("x-forwarded-proto");
        return remoteIpValve;
    }


}
