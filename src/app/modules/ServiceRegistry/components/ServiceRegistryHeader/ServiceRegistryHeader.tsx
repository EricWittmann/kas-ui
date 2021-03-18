import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Level, LevelItem, Title, Dropdown, DropdownItem, DropdownPosition, KebabToggle } from '@patternfly/react-core';

export type ServiceRegistryHeaderProps = {
  name: string;
  onConnectToRegistry: (data: any) => void;
  onDeleteRegistry: (name: string) => void;
};

export const ServiceRegistryHeader: React.FC<ServiceRegistryHeaderProps> = ({
  name,
  onConnectToRegistry,
  onDeleteRegistry,
}: ServiceRegistryHeaderProps) => {
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState<boolean>();

  const onToggle = (isOpen: boolean) => {
    setIsOpen(isOpen);
  };

  const onSelect = () => {
    setIsOpen(!isOpen);
  };

  const dropdownItems = [
    <DropdownItem key="connect-registry" aria-label="connect to registry" onClick={() => onConnectToRegistry(name)}>
      Connect to Registry
    </DropdownItem>,
    <DropdownItem key="delete-registry" aria-label="delete registry" onClick={() => onDeleteRegistry(name)}>
      Delete Registry
    </DropdownItem>,
  ];

  return (
    <Level>
      <LevelItem>
        <Title headingLevel="h1" size="2xl">
          {t('service_registry')}
        </Title>
      </LevelItem>
      <LevelItem>
        <Dropdown
          onSelect={onSelect}
          toggle={<KebabToggle onToggle={onToggle} id="toggle-service-registry" />}
          isOpen={isOpen}
          isPlain
          dropdownItems={dropdownItems}
          position={DropdownPosition.right}
        />
      </LevelItem>
    </Level>
  );
};