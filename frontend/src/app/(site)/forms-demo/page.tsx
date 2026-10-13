"use client";

import { AlertCircle, Check, CheckCircle, ChevronDown, Eye, EyeOff, Loader2, Mail, MapPin, Phone, Save, Shield, User, X, XCircle } from "lucide-react";
import { Form, FieldArray, FloatingLabelInput, FloatingLabelSelect, FloatingLabelTextarea, Checkbox, RadioGroup, FormSection } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";

function basicValidate(data: FormData) {
  const errors: Record<string, string> = {};
  const name = data.get("name");
  const email = data.get("email");
  const password = data.get("password");
  if (!name) errors.name = "Name is required";
  if (!email || !email.toString().includes("@")) errors.email = "Valid email is required";
  if (password && password.toString().length < 8) errors.password = "Password must be at least 8 characters";
  return errors;
}

function advancedValidate(data: FormData) {
  const errors: Record<string, string> = {};
  const conditions = data.getAll("conditions");
  if (conditions.length === 0) errors.conditions = "At least one condition is required";
  return errors;
}

function floatingValidate(data: FormData) {
  const errors: Record<string, string> = {};
  const email = data.get("email");
  if (!email || !email.toString().includes("@")) errors.email = "Valid email is required";
  return errors;
}

export default function FormsDemoPage() {
  const handleBasicSubmit = async (formData: FormData) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Basic form submitted:", Object.fromEntries(formData));
  };

  const handleAdvancedSubmit = async (formData: FormData) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Advanced form submitted:", Object.fromEntries(formData));
  };

  const handleFloatingSubmit = async (formData: FormData) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Floating label form submitted:", Object.fromEntries(formData));
  };

  return (
    <div className="container mx-auto px-4 py-12 space-y-12">
      <header className="space-y-4">
        <h1 className="text-display text-ink">Interactive Forms</h1>
        <p className="text-lead text-muted max-w-2xl">
          Production-ready form components with micro-interactions, floating labels, validation, and accessibility built-in.
        </p>
      </header>

      <section className="space-y-6">
        <h2 className="text-h2 text-ink">Basic Form</h2>
        <p className="text-muted">Standard fields with inline validation and character counts.</p>
        <Card className="p-6">
          <Form onSubmit={handleBasicSubmit} validate={basicValidate}>
            <div className="grid gap-6 md:grid-cols-2">
              <FloatingLabelInput
                name="name"
                label="Full Name"
                placeholder=" "
                required
              />
              <FloatingLabelInput
                name="email"
                label="Email Address"
                type="email"
                placeholder=" "
                required
              />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <FloatingLabelInput
                name="phone"
                label="Phone Number"
                type="tel"
                placeholder=" "
              />
              <FloatingLabelInput
                name="password"
                label="Password"
                type="password"
                placeholder=" "
                showPasswordToggle
                characterCount={32}
                required
                hint="At least 8 characters"
              />
            </div>
            <FloatingLabelTextarea
              name="bio"
              label="Bio"
              placeholder=" "
              characterCount={200}
              rows={4}
            />
            <FloatingLabelSelect
              name="role"
              label="Role"
              required
            >
              <option value="chv">Community Health Volunteer</option>
              <option value="admin">Administrator</option>
              <option value="supervisor">Supervisor</option>
            </FloatingLabelSelect>
          </Form>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-h2 text-ink">Floating Labels</h2>
        <p className="text-muted">Material-style floating labels that animate on focus.</p>
        <Card className="p-6">
          <Form onSubmit={handleFloatingSubmit} validate={floatingValidate}>
            <div className="grid gap-6 md:grid-cols-2">
              <FloatingLabelInput
                name="name"
                label="Full Name"
                placeholder=" "
                required
              />
              <FloatingLabelInput
                name="email"
                label="Email Address"
                type="email"
                placeholder=" "
                required
              />
            </div>
            <FloatingLabelTextarea
              name="address"
              label="Address"
              placeholder=" "
              rows={3}
            />
            <FloatingLabelSelect
              name="county"
              label="County"
              required
            >
              <option value="kitui">Kitui</option>
              <option value="turkana">Turkana</option>
              <option value="kilifi">Kilifi</option>
              <option value="kakamega">Kakamega</option>
              <option value="mwingi">Mwingi</option>
            </FloatingLabelSelect>
          </Form>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-h2 text-ink">Advanced Form</h2>
        <p className="text-muted">Complex form with field arrays, radio groups, and sections.</p>
        <Card className="p-6">
          <Form
            onSubmit={handleAdvancedSubmit}
            initialValues={{
              "patient-age-group": "UNDER_5",
              "patient-gender": "female",
            }}
            validate={advancedValidate}
          >
            <FormSection title="Report Details" description="Basic information about the health report">
              <div className="grid gap-6 md:grid-cols-2">
                <FloatingLabelInput
                  name="report-title"
                  label="Report Title"
                  placeholder=" "
                  required
                />
                <FloatingLabelSelect
                  name="category"
                  label="Category"
                  required
                >
                  <option value="DISEASE_CASE">Disease Case</option>
                  <option value="MATERNAL_HEALTH">Maternal Health</option>
                  <option value="CHILD_HEALTH">Child Health</option>
                  <option value="NUTRITION">Nutrition</option>
                  <option value="WATER_SANITATION">Water & Sanitation</option>
                </FloatingLabelSelect>
              </div>
              <FloatingLabelInput name="location" label="Location" placeholder=" " required />
              <FloatingLabelTextarea name="description" label="Description" placeholder=" " rows={4} characterCount={500} required />
            </FormSection>

            <FormSection title="Patient Information">
              <div className="grid gap-6 md:grid-cols-3">
                <RadioGroup
                  name="patient-age-group"
                  options={[
                    { value: "UNDER_5", label: "Under 5" },
                    { value: "AGE_5_17", label: "5-17 years" },
                    { value: "AGE_18_59", label: "18-59 years" },
                    { value: "AGE_60_PLUS", label: "60+ years" },
                    { value: "MIXED", label: "Mixed" },
                  ]}
                />
                <RadioGroup
                  name="patient-gender"
                  options={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "other", label: "Other" },
                  ]}
                />
                <FloatingLabelSelect name="severity" label="Severity" required>
                  <option value="LOW">Low</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </FloatingLabelSelect>
              </div>
            </FormSection>

            <FormSection title="Symptoms" description="Add observed symptoms">
              <FieldArray
                label="Symptoms"
                minItems={1}
                maxItems={10}
                addLabel="Add symptom"
              >
                {(index, remove) => (
                  <div className="grid gap-4 md:grid-cols-3 w-full">
                    <FloatingLabelInput
                      name={`symptoms[${index}].name`}
                      label="Symptom"
                      placeholder=" "
                      required
                    />
                    <FloatingLabelSelect
                      name={`symptoms[${index}].duration`}
                      label="Duration"
                    >
                      <option value="acute">Less than 24 hours</option>
                      <option value="subacute">1-7 days</option>
                      <option value="chronic">More than 7 days</option>
                    </FloatingLabelSelect>
                    <FloatingLabelInput
                      name={`symptoms[${index}].notes`}
                      label="Notes"
                      placeholder=" "
                    />
                  </div>
                )}
              </FieldArray>
            </FormSection>

            <FormSection title="Attachments">
              <FieldArray
                label="Photos / Documents"
                minItems={0}
                maxItems={5}
                addLabel="Add attachment"
              >
                {(index, remove) => (
                  <div className="grid gap-4 md:grid-cols-[1fr_auto] w-full items-end">
                    <FloatingLabelInput
                      name={`attachments[${index}].url`}
                      label="File URL"
                      placeholder=" "
                      required
                    />
                  </div>
                )}
              </FieldArray>
            </FormSection>
          </Form>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-h2 text-ink">Micro-interaction Showcase</h2>
        <p className="text-muted">Individual input behaviors: focus states, hover effects, press feedback, and validation animations.</p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="p-6 space-y-4">
            <h3 className="text-h3 text-ink">Focus & Hover</h3>
            <p className="text-sm text-muted">Focus ring, border color transition, subtle lift, and shadow glow.</p>
            <FloatingLabelInput name="focus-hover" label="Try focusing me" placeholder=" " />
          </Card>
          <Card className="p-6 space-y-4">
            <h3 className="text-h3 text-ink">Password Toggle</h3>
            <p className="text-sm text-muted">Show/hide password with smooth icon transition.</p>
            <FloatingLabelInput
              name="password-toggle"
              label="Password"
              type="password"
              placeholder=" "
              showPasswordToggle
            />
          </Card>
          <Card className="p-6 space-y-4">
            <h3 className="text-h3 text-ink">Character Count</h3>
            <p className="text-sm text-muted">Live character counter with error state when exceeded.</p>
            <FloatingLabelTextarea name="char-count" label="Limited to 50 chars" characterCount={50} rows={3} placeholder=" " />
          </Card>
          <Card className="p-6 space-y-4">
            <h3 className="text-h3 text-ink">Validation States</h3>
            <p className="text-sm text-muted">Error appears with shake animation, success checkmark on valid.</p>
            <FloatingLabelInput
              name="validation-error"
              label="Email (try invalid)"
              type="email"
              placeholder=" "
              error="Valid email is required"
            />
            <FloatingLabelInput
              name="validation-success"
              label="Valid input"
              type="email"
              placeholder=" "
              showSuccess
            />
          </Card>
          <Card className="p-6 space-y-4">
            <h3 className="text-h3 text-ink">Checkbox & Radio</h3>
            <p className="text-sm text-muted">Spring animation on check/uncheck with custom styling.</p>
            <div className="space-y-3">
              <Checkbox label="Enable notifications" description="Receive email updates about your reports" />
              <Checkbox label="Auto-sync reports" description="Automatically sync when online" defaultChecked />
            </div>
          </Card>
          <Card className="p-6 space-y-4">
            <h3 className="text-h3 text-ink">Select Dropdown</h3>
            <p className="text-sm text-muted">Custom chevron, hover/focus states, smooth open/close.</p>
            <FloatingLabelSelect name="select-dropdown" label="Choose an option">
              <option value="1">Option One</option>
              <option value="2">Option Two</option>
              <option value="3">Option Three</option>
            </FloatingLabelSelect>
          </Card>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-h2 text-ink">Form Actions</h2>
        <p className="text-muted">Submit with loading state, reset button, and success/error feedback.</p>
        <Card className="p-6">
          <Form
            onSubmit={async (data) => {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              console.log("Demo form:", Object.fromEntries(data));
            }}
            validate={(data) => {
              const errors: Record<string, string> = {};
              const demoName = data.get("demo-name");
              if (!demoName) errors["demo-name"] = "Name is required";
              return errors;
            }}
          >
            <FloatingLabelInput name="demo-name" label="Name" placeholder=" " required />
            <FloatingLabelInput name="demo-email" label="Email" type="email" placeholder=" " required />
          </Form>
        </Card>
      </section>
    </div>
  );
}