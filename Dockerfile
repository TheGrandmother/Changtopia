FROM node:13.4.0

WORKDIR /opt/
COPY gcp-config.json config.json
COPY changtopia/ changtopia/
RUN cd changtopia && yarn link && cd ..
COPY backend/ backend/
RUN cd backend && yarn link changtopia && yarn install --production=true && cd ..
COPY frontend/ frontend/
RUN cd frontend && yarn link changtopia && yarn install  --production=true && yarn build && cp -r dist/ ../backend/public && cd ..
RUN rm -rf frontend/

EXPOSE 80
EXPOSE 8999

CMD cd backend/ && node server.js
