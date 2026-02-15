.PHONY: install build test test-int test-coverage local-up local-down local-deploy local-destroy local-reset upload retrieve

install:
	npm install

build:
	npm run build

test:
	npm run test

test-int:
	npm run test:int

test-coverage:
	npm run test:coverage

local-up:
	npm run local:up

local-down:
	npm run local:down

local-deploy:
	npm run local:deploy

local-destroy:
	npm run local:destroy

local-reset:
	npm run local:reset

upload:
	npm run upload

retrieve:
	npm run retrieve
