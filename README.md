# SonarSound

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.0.7.

## Ripple effect

Import `Ripple` from `src/app/shared/directives/ripple` in a component's `imports`, then add `appRipple` to an element:

```html
<button appRipple>Press me</button>
```

The ripple starts at the pointer position, uses the element's text color by default, and respects reduced-motion preferences. Set `--ripple-color` on the element to override the color. Disabled elements do not ripple.

## Topbar content

Import `TopbarLeft` from `src/app/shared/components/topbar/topbar-left` in a component's `imports` and mark an `ng-template` with `appTopbarLeft`:

```html
<ng-template appTopbarLeft>
    <button type="button" (click)="goBack()">Back</button>
</ng-template>
```

The template appears to the left of the search field and retains its declaring component's bindings. It is removed when its view is destroyed. If multiple templates are active, the most recently registered one is shown; the previous one returns when it is removed.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
